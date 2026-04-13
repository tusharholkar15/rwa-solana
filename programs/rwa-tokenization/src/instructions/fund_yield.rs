use anchor_lang::prelude::*;
use crate::errors::RwaError;
use crate::state::{AssetAccount, TreasuryVault};

/// Multiplier for yield precision (10^12)
pub const YIELD_PRECISION: u128 = 1_000_000_000_000;

/// Fund the global yield pool for an asset.
/// Transfers SOL from admin to treasury and updates the global yield-per-share counter.
pub fn handler(ctx: Context<FundYield>, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);
    
    let asset = &mut ctx.accounts.asset;
    let clock = Clock::get()?;

    // 1. Calculate circulating supply (only tokens held by users earn yield)
    let circulating_supply = asset.total_supply.checked_sub(asset.available_supply)
        .ok_or(RwaError::ArithmeticOverflow)?;

    require!(circulating_supply > 0, RwaError::NoHoldersForYield);

    // 2. Transfer SOL from authority to treasury
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        amount,
    )?;

    // 3. Update global accumulated yield per share
    // Formula: acc_yield += (amount * 10^12) / circulating_supply
    let added_yield_per_share = (amount as u128)
        .checked_mul(YIELD_PRECISION)
        .ok_or(RwaError::ArithmeticOverflow)?
        .checked_div(circulating_supply as u128)
        .ok_or(RwaError::ArithmeticOverflow)?;

    asset.accumulated_yield_per_share = asset.accumulated_yield_per_share
        .checked_add(added_yield_per_share)
        .ok_or(RwaError::ArithmeticOverflow)?;

    asset.total_yield_distributed = asset.total_yield_distributed
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    msg!(
        "Funded global yield: {} lamports (circulating supply: {})",
        amount,
        circulating_supply
    );

    Ok(())
}

#[derive(Accounts)]
pub struct FundYield<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    pub system_program: Program<'info, System>,
}
