use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{
    AssetAccount, LiquidityPool, OracleCircuitBreaker, ProgramConfig, 
    TreasuryVault, UserOwnership, WhitelistEntry, MAX_SWAP_POOL_BPS
};

/// Execute an AMM swap — token↔SOL using constant-product formula
/// Includes slippage protection and anti-whale guard.
pub fn handler(
    ctx: Context<SwapTokens>,
    amount_in: u64,
    min_amount_out: u64,
    is_token_to_sol: bool,
) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &ctx.accounts.pool;

    require!(amount_in > 0, RwaError::InvalidAmount);
    require!(pool.is_active, RwaError::PoolNotActive);

    // ── Oracle Circuit Breaker Guard ──────────────────────────
    // Block all swaps if the oracle has tripped (stale/manipulated price).
    // This prevents trading at a frozen price during an oracle outage.
    let breaker = &ctx.accounts.circuit_breaker;
    require!(
        !breaker.is_tripped,
        RwaError::OracleCircuitBreakerTripped
    );

    // Validate whitelist & Compliance Tier
    let whitelist = &mut ctx.accounts.user_whitelist;
    let asset = &ctx.accounts.asset;
    
    // 1. Basic Validity (KYC & AML)
    require!(
        whitelist.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
    );

    // 2. Tier Check (Asset-specific requirements)
    require!(
        whitelist.meets_tier(asset.min_compliance_tier),
        RwaError::InsufficientTier
    );

    // 3. Jurisdiction Check
    require!(
        asset.is_jurisdiction_allowed(whitelist.jurisdiction as u8),
        RwaError::JurisdictionBlocked
    );

    // 4. Investment Limit Check
    require!(
        whitelist.is_within_limit(amount_in),
        RwaError::InvestmentLimitExceeded
    );

    // Anti-whale: single swap cannot exceed MAX_SWAP_POOL_BPS of relevant reserve
    let max_swap = if is_token_to_sol {
        pool.token_reserve
            .checked_mul(MAX_SWAP_POOL_BPS as u64)
            .ok_or(RwaError::ArithmeticOverflow)?
            / 10000
    } else {
        pool.sol_reserve
            .checked_mul(MAX_SWAP_POOL_BPS as u64)
            .ok_or(RwaError::ArithmeticOverflow)?
            / 10000
    };
    require!(amount_in <= max_swap, RwaError::SwapExceedsWhaleLimit);

    // Calculate swap output
    let (amount_out, fee_amount) = pool
        .calculate_swap_output(amount_in, is_token_to_sol)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Slippage check
    require!(amount_out >= min_amount_out, RwaError::SlippageExceeded);

    // Validate sufficient output reserves
    let output_reserve = if is_token_to_sol {
        pool.sol_reserve
    } else {
        pool.token_reserve
    };
    require!(amount_out < output_reserve, RwaError::InsufficientLiquidity);

    // Execute the swap
    let asset_key = ctx.accounts.asset.key();
    let pool_seeds = &[
        LiquidityPool::SEED_PREFIX,
        asset_key.as_ref(),
        &[pool.bump],
    ];
    let pool_signer = &[&pool_seeds[..]];

    if is_token_to_sol {
        // User sends tokens → receives SOL
        // 1. Transfer tokens from user to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.pool_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // 2. Transfer SOL from pool to user
        **ctx
            .accounts
            .pool
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount_out;
        **ctx
            .accounts
            .user
            .to_account_info()
            .try_borrow_mut_lamports()? += amount_out;

        // 3. Handle DAO Fee Routing (if SOL is out, fee was in tokens — for now we focus on SOL routing)
    } else {
        // User sends SOL → receives tokens
        // 1. Transfer SOL from user to pool
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.pool.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // 2. Route Fee to DAO Treasury if present
        let pool_data = &ctx.accounts.pool;
        if pool_data.dao_fee_share_bps > 0 {
            let dao_fee = (fee_amount as u128)
                .checked_mul(pool_data.dao_fee_share_bps as u128)
                .ok_or(RwaError::ArithmeticOverflow)?
                .checked_div(10000)
                .ok_or(RwaError::ArithmeticOverflow)? as u64;

            if dao_fee > 0 {
                **ctx.accounts.pool.to_account_info().try_borrow_mut_lamports()? -= dao_fee;
                **ctx.accounts.dao_treasury.to_account_info().try_borrow_mut_lamports()? += dao_fee;
                
                let pool_mut = &mut ctx.accounts.pool;
                pool_mut.total_dao_fees_sol = pool_mut.total_dao_fees_sol.checked_add(dao_fee).unwrap();
            }
        }

        // 3. Transfer tokens from pool to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.pool_token_account.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                pool_signer,
            ),
            amount_out,
        )?;
    }

    }
    
    // ── Step 8: Price Impact Guard ────────────────────────────
    // Calculate price movement: |P_new - P_old| / P_old
    // We utilize the Constant Product Formula property: P = y / x
    // To avoid floating point, we use: |y'/x' - y/x| <= 0.03 * y/x
    // Which simplifies to: |y'x - yx'| <= 0.03 * yx
    let old_sol = if is_token_to_sol { pool.sol_reserve + amount_out } else { pool.sol_reserve - amount_in };
    let old_token = if is_token_to_sol { pool.token_reserve - amount_in } else { pool.token_reserve + amount_out };
    
    let y_prime = pool.sol_reserve as u128;
    let x_prime = pool.token_reserve as u128;
    let y = old_sol as u128;
    let x = old_token as u128;
    
    let left = y_prime.checked_mul(x).unwrap();
    let right = y.checked_mul(x_prime).unwrap();
    
    let diff = if left > right { left - right } else { right - left };
    let limit = right.checked_mul(300).unwrap() / 10000; // 3%
    
    require!(diff <= limit, RwaError::ExcessivePriceImpact);

    pool.last_k = pool.compute_k();
    
    // Update aggregate investment tracking
    if !is_token_to_sol {
        let whitelist = &mut ctx.accounts.user_whitelist;
        whitelist.total_invested = whitelist.total_invested.checked_add(amount_in).ok_or(RwaError::ArithmeticOverflow)?;

        // HARDENING: Sync UserOwnership for Governance & Yield via centralized method
        let ownership = &mut ctx.accounts.user_ownership;
        ownership.record_acquisition(
            amount_out, 
            ctx.accounts.asset.price_per_token, // AMM trade recorded at platform valuation
            clock.slot, 
            clock.unix_timestamp
        )?;
    } else {
        // User is selling tokens
        let ownership = &mut ctx.accounts.user_ownership;
        require!(ownership.shares_owned >= amount_in, RwaError::InsufficientShares);
        ownership.shares_owned = ownership.shares_owned.checked_sub(amount_in).ok_or(RwaError::ArithmeticOverflow)?;
        ownership.last_transaction_at = clock.unix_timestamp;
    }
    
    pool.tvl = pool.sol_reserve.checked_mul(2).ok_or(RwaError::ArithmeticOverflow)?;
    pool.last_swap_at = clock.unix_timestamp;
    pool.total_swaps = pool
        .total_swaps
        .checked_add(1)
        .ok_or(RwaError::ArithmeticOverflow)?;

    msg!(
        "Swap on '{}': {} {} → {} {} (fee={})",
        ctx.accounts.asset.name,
        amount_in,
        if is_token_to_sol { "tokens" } else { "lamports" },
        amount_out,
        if is_token_to_sol { "lamports" } else { "tokens" },
        fee_amount
    );

    Ok(())
}

#[derive(Accounts)]
pub struct SwapTokens<'info> {
    /// The swap user
    #[account(mut)]
    pub user: Signer<'info>,

    /// The asset
    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The liquidity pool
    #[account(
        mut,
        seeds = [LiquidityPool::SEED_PREFIX, asset.key().as_ref()],
        bump = pool.bump,
        constraint = pool.is_active @ RwaError::PoolNotActive,
    )]
    pub pool: Account<'info, LiquidityPool>,

    /// Pool's token account
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = pool,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    /// Oracle circuit breaker for this asset — must NOT be tripped
    #[account(
        seeds = [OracleCircuitBreaker::SEED_PREFIX, asset.key().as_ref()],
        bump = circuit_breaker.bump,
    )]
    pub circuit_breaker: Account<'info, OracleCircuitBreaker>,

    /// User's token account
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// User's whitelist (must be KYC'd)
    #[account(
        mut,
        seeds = [WhitelistEntry::SEED_PREFIX, user.key().as_ref()],
        bump = user_whitelist.bump,
    )]
    pub user_whitelist: Account<'info, WhitelistEntry>,

    /// User's institutional ownership record (for Governance/Yield)
    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), user.key().as_ref()],
        bump = user_ownership.bump,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    /// The asset's DAO TreasuryVault (receives protocol/DAO fees)
    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = dao_treasury.bump,
    )]
    pub dao_treasury: Account<'info, TreasuryVault>,

    /// Global platform config
    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
