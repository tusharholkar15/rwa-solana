use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{AssetAccount, TreasuryVault, UserOwnership};

/// Distribute yield (rental income) to a specific token holder
/// Admin calls this per-holder with a proportional amount
pub fn handler(ctx: Context<DistributeYield>, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);

    let clock = Clock::get()?;
    let asset = &ctx.accounts.asset;

    // Only the asset authority can distribute yield
    require!(
        ctx.accounts.authority.key() == asset.authority,
        RwaError::Unauthorized
    );

    // Validate the treasury has enough funds
    let treasury = &ctx.accounts.treasury;
    let treasury_lamports = treasury.to_account_info().lamports();
    require!(
        treasury_lamports >= amount,
        RwaError::InsufficientTreasuryBalance
    );

    // Transfer SOL from treasury to the holder
    **ctx
        .accounts
        .treasury
        .to_account_info()
        .try_borrow_mut_lamports()? -= amount;
    **ctx
        .accounts
        .holder
        .to_account_info()
        .try_borrow_mut_lamports()? += amount;

    // Update treasury stats
    let treasury = &mut ctx.accounts.treasury;
    treasury.total_yield_distributed = treasury
        .total_yield_distributed
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Update asset stats
    let asset = &mut ctx.accounts.asset;
    asset.total_yield_distributed = asset
        .total_yield_distributed
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Update holder's yield record
    let ownership = &mut ctx.accounts.user_ownership;
    ownership.total_yield_received = ownership
        .total_yield_received
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;
    ownership.last_transaction_at = clock.unix_timestamp;

    msg!(
        "Distributed {} lamports yield to holder {} for asset '{}'",
        amount,
        ctx.accounts.holder.key(),
        asset.name
    );

    Ok(())
}

#[derive(Accounts)]
pub struct DistributeYield<'info> {
    /// The asset authority (admin)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The asset
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Treasury vault PDA
    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    /// The token holder receiving yield
    /// CHECK: validated via ownership PDA
    #[account(mut)]
    pub holder: UncheckedAccount<'info>,

    /// Holder's ownership record
    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), holder.key().as_ref()],
        bump = user_ownership.bump,
        constraint = user_ownership.shares_owned > 0 @ RwaError::InsufficientShares,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    pub system_program: Program<'info, System>,
}
