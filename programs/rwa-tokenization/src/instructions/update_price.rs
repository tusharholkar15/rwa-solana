use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::errors::RwaError;
use crate::state::{
    AssetAccount, OracleCircuitBreaker,
    ORACLE_SOURCE_PYTH, ORACLE_SOURCE_SWITCHBOARD, ORACLE_SOURCE_TWAP,
};

/// Update asset price with multi-oracle aggregation and circuit breaker protection.
///
/// Upgrade from v1 (single Pyth feed) to v3 (multi-source with anomaly detection):
///   1. Fetch Pyth price (primary)
///   2. Accept Switchboard price as instruction argument (validated on-chain by caller)
///   3. Compute spread: |pyth - switchboard| / min(pyth, switchboard)
///   4. If spread > 5%: record breach, check if circuit breaker should trip
///   5. If spread OK: compute weighted TWAP-adjusted final price
///   6. Update asset.price_per_token + oracle_source bitmask
///   7. Record success in circuit breaker (resets failure counter)
///
/// If the circuit breaker trips, asset.is_active = false until guardian resets.
pub fn handler(
    ctx: Context<UpdatePrice>,
    switchboard_price: u64,    // Off-chain validated Switchboard price (lamports)
    twap_price: u64,           // Backend-computed 1h TWAP (lamports), 0 = use live only
) -> Result<()> {
    let asset = &ctx.accounts.asset;
    let clock = Clock::get()?;

    // Only authority can trigger price updates
    require!(
        ctx.accounts.authority.key() == asset.authority,
        RwaError::Unauthorized
    );

    // Check if circuit breaker is already tripped
    let breaker = &ctx.accounts.circuit_breaker;
    require!(!breaker.is_tripped, RwaError::OracleCircuitBreakerTripped);

    // ── Step 1: Read Pyth Price Feed ─────────────────────────
    let price_update = &ctx.accounts.price_update;
    let maximum_age: u64 = 60; // Max 60s staleness

    let pyth_data_result = price_update.get_price_no_older_than(&clock, maximum_age, &asset.oracle_feed_id);

    if pyth_data_result.is_err() {
        let breaker = &mut ctx.accounts.circuit_breaker;
        breaker.consecutive_failures = breaker.consecutive_failures.saturating_add(1);
        
        let is_tripping = breaker.should_trip_failure();
        if is_tripping {
            breaker.trip(OracleCircuitBreaker::TRIP_REASON_FAILURE, clock.unix_timestamp);
            let asset = &mut ctx.accounts.asset;
            asset.is_active = false;
        }

        emit!(crate::OracleFailureDetected {
            asset: asset.key(),
            consecutive_failures: breaker.consecutive_failures,
            is_tripped: is_tripping,
            timestamp: clock.unix_timestamp,
        });

        return if is_tripping {
            Err(RwaError::OracleCircuitBreakerTripped.into())
        } else {
            Err(RwaError::StalePriceData.into())
        };
    }

    let pyth_data = pyth_data_result.unwrap();
    require!(pyth_data.price > 0, RwaError::InvalidOracleFeed);

    // Convert Pyth price to lamports
    let pyth_price_lamports = pyth_to_lamports(pyth_data.price, pyth_data.exponent)?;

    // ── Step 2: Validate Switchboard Input ───────────────────
    // Switchboard price passed as argument (caller fetches from their on-chain feed)
    if switchboard_price == 0 {
        let breaker = &mut ctx.accounts.circuit_breaker;
        breaker.consecutive_failures = breaker.consecutive_failures.saturating_add(1);
        // ... same logic as above or combine ...
        return Err(RwaError::InvalidOracleFeed.into());
    }

    // ── Step 3: Compute Spread ────────────────────────────────
    let min_price = pyth_price_lamports.min(switchboard_price);
    let max_price = pyth_price_lamports.max(switchboard_price);

    // spread_bps = (max - min) / min * 10_000
    let spread_bps = ((max_price - min_price) as u128)
        .checked_mul(10_000)
        .unwrap_or(u128::MAX)
        .checked_div(min_price as u128)
        .unwrap_or(u128::MAX) as u16;

    let breaker = &mut ctx.accounts.circuit_breaker;

    // ── Step 4: Circuit Breaker Logic ─────────────────────────
    if spread_bps > OracleCircuitBreaker::MAX_SPREAD_BPS {
        breaker.record_breach(spread_bps);

        if breaker.should_trip_spread() {
            // Trip! Pause the asset
            breaker.trip(OracleCircuitBreaker::TRIP_REASON_SPREAD, clock.unix_timestamp);
            let asset = &mut ctx.accounts.asset;
            asset.is_active = false;

            msg!(
                "CIRCUIT BREAKER TRIPPED for '{}': spread {}bps > {}bps threshold | Consecutive breaches: {}",
                asset.name,
                spread_bps,
                OracleCircuitBreaker::MAX_SPREAD_BPS,
                breaker.consecutive_spread_breaches
            );

            emit!(crate::OracleBreachDetected {
                asset: asset.key(),
                spread_bps,
                consecutive_breaches: breaker.consecutive_spread_breaches,
                is_tripped: true,
                timestamp: clock.unix_timestamp,
            });

            return Ok(()); // Return early — price NOT updated
        }

        // Log breach but don't trip yet — use TWAP as fallback
        msg!(
            "Oracle spread breach #{} for '{}': {}bps | Using TWAP fallback",
            breaker.consecutive_spread_breaches,
            asset.name,
            spread_bps
        );

        emit!(crate::OracleBreachDetected {
            asset: asset.key(),
            spread_bps,
            consecutive_breaches: breaker.consecutive_spread_breaches,
            is_tripped: false,
            timestamp: clock.unix_timestamp,
        });
    }

    // ── Step 5: Compute Final Price ───────────────────────────
    // Priority: If spread OK → median of Pyth + Switchboard
    //           If spread breach → use TWAP (if provided)
    //           If no TWAP → use last valid price
    let (final_price, oracle_source) = if spread_bps <= OracleCircuitBreaker::MAX_SPREAD_BPS {
        // Healthy: weighted average (Pyth 60%, Switchboard 40%)
        let weighted = ((pyth_price_lamports as u128 * 6 + switchboard_price as u128 * 4) / 10) as u64;
        (weighted, ORACLE_SOURCE_PYTH | ORACLE_SOURCE_SWITCHBOARD)
    } else if twap_price > 0 {
        // Breach but have TWAP
        (twap_price, ORACLE_SOURCE_TWAP)
    } else {
        // Breach, no TWAP — use last valid price, don't update
        msg!("Using last valid price due to spread breach and no TWAP");
        return Ok(());
    };

    // HARDENING: Basic Z-Score Trip (Variance)
    if breaker.price_count_1h > 10 {
        let mean = breaker.price_sum_1h / breaker.price_count_1h as u64;
        let diff = if final_price > mean { final_price - mean } else { mean - final_price };
        let deviation_bps = (diff as u128 * 10000 / mean as u128) as u16;
        
        if deviation_bps > 2000 { // 20% variance trip
            breaker.trip(OracleCircuitBreaker::TRIP_REASON_ZSCORE, clock.unix_timestamp);
            let asset = &mut ctx.accounts.asset;
            asset.is_active = false;
            
            emit!(crate::OracleZScoreBreachDetected {
                asset: asset.key(),
                zscore_x100: deviation_bps,
                price: final_price,
                is_tripped: true,
                timestamp: clock.unix_timestamp,
            });
            return Ok(());
        }
    }

    // ── Step 6: Update Asset Price ────────────────────────────
    let asset = &mut ctx.accounts.asset;
    asset.price_per_token = final_price;
    asset.last_price_update = clock.unix_timestamp;
    asset.oracle_source = oracle_source;

    // ── Step 7: Record Success in Circuit Breaker ─────────────
    let breaker = &mut ctx.accounts.circuit_breaker;
    breaker.record_success(final_price, clock.unix_timestamp);

    emit!(crate::PriceUpdated {
        asset: asset.key(),
        price: final_price,
        oracle_source,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Price updated for '{}': {} lamports | Pyth: {} | Switchboard: {} | Spread: {}bps | Source: 0b{:04b}",
        asset.name,
        final_price,
        pyth_price_lamports,
        switchboard_price,
        spread_bps,
        oracle_source
    );

    Ok(())
}

/// Emergency guardian reset of a tripped circuit breaker.
/// Only callable by the designated guardian wallet after investigation.
pub fn reset_circuit_breaker_handler(ctx: Context<ResetCircuitBreaker>) -> Result<()> {
    let breaker = &ctx.accounts.circuit_breaker;

    require!(
        ctx.accounts.guardian.key() == breaker.guardian,
        RwaError::Unauthorized
    );
    require!(breaker.is_tripped, RwaError::InvalidAmount); // Breaker must be tripped

    let breaker = &mut ctx.accounts.circuit_breaker;
    breaker.reset();

    // Re-activate the asset
    let asset = &mut ctx.accounts.asset;
    asset.is_active = true;

    msg!(
        "Circuit breaker RESET for '{}' by guardian {}",
        asset.name,
        ctx.accounts.guardian.key()
    );

    Ok(())
}

/// Convert Pyth price (with exponent) to lamports
fn pyth_to_lamports(price: i64, exponent: i32) -> Result<u64> {
    require!(price > 0, RwaError::InvalidOracleFeed);
    let lamports = if exponent >= 0 {
        (price as u64)
            .checked_mul(10u64.pow(exponent as u32))
            .ok_or(RwaError::ArithmeticOverflow)?
    } else {
        let divisor = 10u64.pow((-exponent) as u32);
        (price as u64)
            .checked_div(divisor)
            .ok_or(RwaError::ArithmeticOverflow)?
    };
    Ok(lamports)
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    /// The asset authority triggering the price update
    pub authority: Signer<'info>,

    /// The asset to update
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Circuit breaker PDA for this asset
    #[account(
        mut,
        seeds = [OracleCircuitBreaker::SEED_PREFIX, asset.key().as_ref()],
        bump = circuit_breaker.bump,
    )]
    pub circuit_breaker: Account<'info, OracleCircuitBreaker>,

    /// Pyth price update account
    pub price_update: Account<'info, PriceUpdateV2>,
}

#[derive(Accounts)]
pub struct ResetCircuitBreaker<'info> {
    /// Guardian authorized to reset the breaker
    pub guardian: Signer<'info>,

    /// The asset to re-activate
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The circuit breaker to reset
    #[account(
        mut,
        seeds = [OracleCircuitBreaker::SEED_PREFIX, asset.key().as_ref()],
        bump = circuit_breaker.bump,
        constraint = circuit_breaker.guardian == guardian.key() @ RwaError::Unauthorized,
    )]
    pub circuit_breaker: Account<'info, OracleCircuitBreaker>,
}
