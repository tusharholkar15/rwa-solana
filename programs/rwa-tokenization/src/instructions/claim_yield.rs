use anchor_lang::prelude::*;
use crate::errors::RwaError;
use crate::state::{AssetAccount, TreasuryVault, UserOwnership};
use crate::instructions::fund_yield::YIELD_PRECISION;

/// Claim accrued SOL yield for a specific asset.
/// Uses a "debt-based" pull model to calculate the user's share of the global yield pool.
pub fn handler(ctx: Context<ClaimYield>) -> Result<()> {
    let clock = Clock::get()?;
    let asset = &ctx.accounts.asset;
    let ownership = &mut ctx.accounts.user_ownership;

    // 1. Calculate pending yield
    // Scaled claimable = (shares * global_acc) - debt
    let total_acc_scaled = (ownership.shares_owned as u128)
        .checked_mul(asset.accumulated_yield_per_share)
        .ok_or(RwaError::ArithmeticOverflow)?;

    let pending_scaled = total_acc_scaled
        .checked_sub(ownership.yield_debt)
        .ok_or(RwaError::ArithmeticOverflow)?;

    let mut amount_lamports = (pending_scaled / YIELD_PRECISION) as u64;
    
    // Add yield realized during trade events
    amount_lamports = amount_lamports
        .checked_add(ownership.unclaimed_yield_lamports)
        .ok_or(RwaError::ArithmeticOverflow)?;

    require!(amount_lamports > 0, RwaError::NoYieldToClaim);

    // 2. Cooldown check (Flash-loan/yield-sniping protection)
    // Must hold for at least 1,000 slots before claiming
    let current_slot = clock.slot;
    require!(
        current_slot >= ownership.last_acquired_slot + 1000,
        RwaError::ClaimCooldownActive
    );

    // 3. Verify treasury has enough SOL
    let treasury_info = ctx.accounts.treasury.to_account_info();
    require!(
        treasury_info.lamports() >= amount_lamports,
        RwaError::InsufficientTreasuryBalance
    );

    // 4. Update user debt and totals
    // Update debt to match current theoretical max
    ownership.yield_debt = total_acc_scaled;
    ownership.unclaimed_yield_lamports = 0; // Reset checkpointed yield
    ownership.total_yield_received = ownership.total_yield_received
        .checked_add(amount_lamports)
        .ok_or(RwaError::ArithmeticOverflow)?;
    ownership.last_transaction_at = clock.unix_timestamp;

    // 5. Transfer SOL from treasury vault PDA to the user
    **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? -= amount_lamports;
    **ctx.accounts.holder.to_account_info().try_borrow_mut_lamports()? += amount_lamports;

    msg!(
        "User claimed {} lamports yield for asset '{}'",
        amount_lamports,
        asset.name
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimYield<'info> {
    #[account(mut)]
    pub holder: Signer<'info>,

    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), holder.key().as_ref()],
        bump = user_ownership.bump,
        constraint = user_ownership.shares_owned > 0 @ RwaError::InsufficientShares,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    pub system_program: Program<'info, System>,
}
