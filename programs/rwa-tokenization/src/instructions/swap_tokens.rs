use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, LiquidityPool, OracleCircuitBreaker, WhitelistEntry, MAX_SWAP_POOL_BPS};

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

    // Validate whitelist
    let whitelist = &ctx.accounts.user_whitelist;
    require!(
        whitelist.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
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

        // 2. Transfer tokens from pool to user
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

    // Update pool reserves
    let pool = &mut ctx.accounts.pool;
    if is_token_to_sol {
        pool.token_reserve = pool
            .token_reserve
            .checked_add(amount_in)
            .ok_or(RwaError::ArithmeticOverflow)?;
        pool.sol_reserve = pool
            .sol_reserve
            .checked_sub(amount_out)
            .ok_or(RwaError::ArithmeticOverflow)?;
        pool.collected_fees_token = pool
            .collected_fees_token
            .checked_add(fee_amount)
            .ok_or(RwaError::ArithmeticOverflow)?;
    } else {
        pool.sol_reserve = pool
            .sol_reserve
            .checked_add(amount_in)
            .ok_or(RwaError::ArithmeticOverflow)?;
        pool.token_reserve = pool
            .token_reserve
            .checked_sub(amount_out)
            .ok_or(RwaError::ArithmeticOverflow)?;
        pool.collected_fees_sol = pool
            .collected_fees_sol
            .checked_add(fee_amount)
            .ok_or(RwaError::ArithmeticOverflow)?;
    }

    pool.last_k = pool.compute_k();
    pool.tvl = pool
        .sol_reserve
        .checked_mul(2)
        .ok_or(RwaError::ArithmeticOverflow)?;
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
        seeds = [WhitelistEntry::SEED_PREFIX, user.key().as_ref()],
        bump = user_whitelist.bump,
    )]
    pub user_whitelist: Account<'info, WhitelistEntry>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
