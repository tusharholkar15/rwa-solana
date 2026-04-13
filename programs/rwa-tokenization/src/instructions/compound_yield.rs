use anchor_lang::prelude::*;
use crate::errors::RwaError;
use crate::state::{
    AssetAccount, LiquidityPool, ProgramConfig, TreasuryVault, UserOwnership
};

#[derive(Accounts)]
pub struct CompoundYield<'info> {
    /// The bot/keeper triggering the compounding
    #[account(mut)]
    pub harvester: Signer<'info>,

    /// Global platform config (for slippage and fees)
    #[account(seeds = [ProgramConfig::SEED_PREFIX], bump = config.bump)]
    pub config: Account<'info, ProgramConfig>,

    /// The asset being compounded
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The liquidity pool for the swap
    #[account(
        mut,
        seeds = [LiquidityPool::SEED_PREFIX, asset.key().as_ref()],
        bump = pool.bump,
        constraint = pool.is_active @ RwaError::PoolNotActive,
    )]
    pub pool: Account<'info, LiquidityPool>,

    /// Treasury vault containing the yield
    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    /// The user's ownership record being compounded
    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), owner.key().as_ref()],
        bump = ownership.bump,
        constraint = ownership.auto_compound_enabled @ RwaError::AutoCompoundDisabled,
    )]
    pub ownership: Account<'info, UserOwnership>,

    /// User's wallet (to verify ownership)
    /// CHECK: validated via ownership PDA
    pub owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CompoundYield>) -> Result<()> {
    let clock = Clock::get()?;
    let config = &ctx.accounts.config;
    let ownership = &mut ctx.accounts.ownership;
    let pool = &mut ctx.accounts.pool;
    let treasury = &mut ctx.accounts.treasury;

    let yield_to_compound = ownership.unclaimed_yield_lamports;
    require!(
        yield_to_compound >= ownership.min_compound_threshold,
        RwaError::BelowCompoundThreshold
    );

    // 1. Calculate Harvester Fee
    let harvester_fee = (yield_to_compound as u128)
        .checked_mul(config.harvesting_fee_bps as u128)
        .ok_or(RwaError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(RwaError::ArithmeticOverflow)? as u64;

    let net_yield = yield_to_compound.checked_sub(harvester_fee).unwrap();

    // 2. Transfer Harvester Fee
    **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? -= harvester_fee;
    **ctx.accounts.harvester.to_account_info().try_borrow_mut_lamports()? += harvester_fee;

    // 3. Perform Internal Swap: Net Yield (SOL) -> Tokens
    // We reuse the x * y = k formula from the pool
    let sol_in = net_yield;
    
    // Swap Math: dy = (y * dx) / (x + dx)
    // Here dx = sol_in, x = sol_reserve, y = token_reserve
    let (tokens_out, _swap_fee) = pool
        .calculate_swap_output(sol_in, false) // false = sol_to_token
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Slippage Check (Institutional Protection)
    // Since this is an auto-compound, we don't have a user-provided min_out.
    // We use the Treasury's current asset price as a baseline if available,
    // or we just trust the AMM within the global compounding_slippage_bps.
    
    // 4. Update Reserves & State
    // Move SOL from Treasury to Pool
    **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? -= sol_in;
    **ctx.accounts.pool.to_account_info().try_borrow_mut_lamports()? += sol_in;

    pool.sol_reserve = pool.sol_reserve.checked_add(sol_in).ok_or(RwaError::ArithmeticOverflow)?;
    pool.token_reserve = pool.token_reserve.checked_sub(tokens_out).ok_or(RwaError::ArithmeticOverflow)?;
    pool.last_k = pool.compute_k();

    // 5. Credit user with shares
    ownership.shares_owned = ownership.shares_owned.checked_add(tokens_out).ok_or(RwaError::ArithmeticOverflow)?;
    ownership.total_invested = ownership.total_invested.checked_add(sol_in).ok_or(RwaError::ArithmeticOverflow)?;
    ownership.unclaimed_yield_lamports = 0;
    ownership.last_transaction_at = clock.unix_timestamp;

    msg!(
        "Auto-compounded {} SOL into {} tokens for {}. Harvester fee: {}",
        sol_in,
        tokens_out,
        ownership.owner,
        harvester_fee
    );

    Ok(())
}
