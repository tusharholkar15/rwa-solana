use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};

use crate::errors::RwaError;
use crate::state::AssetAccount;

/// Update asset price from Pyth oracle price feed
/// Fetches the latest price and updates the asset's price_per_token
pub fn handler(ctx: Context<UpdatePrice>) -> Result<()> {
    let asset = &ctx.accounts.asset;
    let clock = Clock::get()?;

    // Only authority can trigger price updates
    require!(
        ctx.accounts.authority.key() == asset.authority,
        RwaError::Unauthorized
    );

    // Read the Pyth price feed
    let price_update = &ctx.accounts.price_update;

    // Maximum age of price data (60 seconds)
    let maximum_age: u64 = 60;

    // Get the price from the oracle
    let price = price_update
        .get_price_no_older_than(&clock, maximum_age, &asset.oracle_feed_id)
        .map_err(|_| RwaError::StalePriceData)?;

    // Convert oracle price to lamports per token
    // Pyth prices have an exponent (e.g., price = 50000, exponent = -8 means $500.00)
    // We need to convert this to lamports (1 SOL = 10^9 lamports)
    let oracle_price = price.price;
    let oracle_exponent = price.exponent;

    // For RWA, we use the oracle price as a reference multiplier
    // The actual token price is calculated based on the total property value
    // divided by total supply, adjusted by the oracle's reference rate
    require!(oracle_price > 0, RwaError::InvalidOracleFeed);

    // Update the price (simplified: use oracle price directly in lamports)
    // In production, this would involve more complex valuation logic
    let new_price = if oracle_exponent >= 0 {
        (oracle_price as u64)
            .checked_mul(10u64.pow(oracle_exponent as u32))
            .ok_or(RwaError::ArithmeticOverflow)?
    } else {
        let divisor = 10u64.pow((-oracle_exponent) as u32);
        (oracle_price as u64)
            .checked_div(divisor)
            .ok_or(RwaError::ArithmeticOverflow)?
    };

    // Update asset price
    let asset = &mut ctx.accounts.asset;
    asset.price_per_token = new_price;
    asset.last_price_update = clock.unix_timestamp;

    msg!(
        "Updated price for '{}' to {} lamports (oracle: {} * 10^{})",
        asset.name,
        new_price,
        oracle_price,
        oracle_exponent
    );

    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    /// The asset authority
    pub authority: Signer<'info>,

    /// The asset to update
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Pyth price update account (verified by the Pyth program)
    pub price_update: Account<'info, PriceUpdateV2>,
}
