use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::WhitelistEntry;

/// Whitelist a KYC-verified user
pub fn handler(ctx: Context<WhitelistUser>) -> Result<()> {
    let clock = Clock::get()?;

    let whitelist = &mut ctx.accounts.whitelist_entry;
    whitelist.user = ctx.accounts.user.key();
    whitelist.is_verified = true;
    whitelist.verified_by = ctx.accounts.authority.key();
    whitelist.verified_at = clock.unix_timestamp;
    whitelist.expires_at = 0; // No expiry by default
    whitelist.bump = ctx.bumps.whitelist_entry;

    msg!(
        "User {} has been whitelisted by {}",
        ctx.accounts.user.key(),
        ctx.accounts.authority.key()
    );

    Ok(())
}

/// Remove a user from the whitelist
pub fn remove_handler(ctx: Context<RemoveWhitelist>) -> Result<()> {
    let whitelist = &mut ctx.accounts.whitelist_entry;
    whitelist.is_verified = false;

    msg!(
        "User {} has been removed from whitelist",
        whitelist.user
    );

    Ok(())
}

#[derive(Accounts)]
pub struct WhitelistUser<'info> {
    /// Admin authority performing KYC verification
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user being whitelisted
    /// CHECK: This is just the user's pubkey, no data read
    pub user: UncheckedAccount<'info>,

    /// Whitelist entry PDA for this user
    #[account(
        init,
        payer = authority,
        space = 8 + WhitelistEntry::INIT_SPACE,
        seeds = [WhitelistEntry::SEED_PREFIX, user.key().as_ref()],
        bump,
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveWhitelist<'info> {
    /// Admin authority
    pub authority: Signer<'info>,

    /// Whitelist entry to modify
    #[account(
        mut,
        seeds = [WhitelistEntry::SEED_PREFIX, whitelist_entry.user.as_ref()],
        bump = whitelist_entry.bump,
        constraint = whitelist_entry.is_verified @ RwaError::NotWhitelisted,
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,
}
