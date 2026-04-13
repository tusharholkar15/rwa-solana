use anchor_lang::prelude::*;
use crate::state::{AssetAccount, PriceHistory};

/// Initialize on-chain price history for an asset.
/// This is a ring buffer that stores historical price points for TWAP fallback.
pub fn handler(ctx: Context<InitializePriceHistory>) -> Result<()> {
    let price_history = &mut ctx.accounts.price_history;
    price_history.asset = ctx.accounts.asset.key();
    price_history.head = 0;
    price_history.count = 0;
    price_history.bump = ctx.bumps.price_history;

    msg!("Price history initialized for asset: {}", ctx.accounts.asset.key());
    Ok(())
}

#[derive(Accounts)]
pub struct InitializePriceHistory<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key(),
    )]
    pub asset: Account<'info, AssetAccount>,

    #[account(
        init,
        payer = authority,
        space = 8 + PriceHistory::INIT_SPACE,
        seeds = [PriceHistory::SEED_PREFIX, asset.key().as_ref()],
        bump
    )]
    pub price_history: Account<'info, PriceHistory>,

    pub system_program: Program<'info, System>,
}
