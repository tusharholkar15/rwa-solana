use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{UserRole, WhitelistEntry};

/// Set a user's role, compliance tier, and jurisdiction on-chain
/// Only callable by an admin.
pub fn handler(
    ctx: Context<SetRole>,
    role: UserRole,
    compliance_tier: u8,
    jurisdiction: u16,
    aml_flags: u8,
    investment_limit: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    // Validate the caller is an admin
    let admin_whitelist = &ctx.accounts.admin_whitelist;
    require!(admin_whitelist.is_admin(), RwaError::Unauthorized);

    // Update the target user's whitelist entry
    let target = &mut ctx.accounts.target_whitelist;
    target.role = role;
    target.compliance_tier = compliance_tier;
    target.jurisdiction = jurisdiction;
    target.aml_flags = aml_flags;
    target.investment_limit = investment_limit;
    target.aml_cleared_at = clock.unix_timestamp;

    msg!(
        "Updated role for {} — role={:?}, tier={}, jurisdiction={}, aml_flags={}",
        target.user,
        role,
        compliance_tier,
        jurisdiction,
        aml_flags
    );

    Ok(())
}

#[derive(Accounts)]
pub struct SetRole<'info> {
    /// The admin performing the role change
    pub admin: Signer<'info>,

    /// Admin's own whitelist entry (must have Admin role)
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, admin.key().as_ref()],
        bump = admin_whitelist.bump,
        constraint = admin_whitelist.role == UserRole::Admin @ RwaError::Unauthorized,
    )]
    pub admin_whitelist: Account<'info, WhitelistEntry>,

    /// Target user's whitelist entry to update
    #[account(
        mut,
        seeds = [WhitelistEntry::SEED_PREFIX, target_whitelist.user.as_ref()],
        bump = target_whitelist.bump,
    )]
    pub target_whitelist: Account<'info, WhitelistEntry>,

    pub system_program: Program<'info, System>,
}
