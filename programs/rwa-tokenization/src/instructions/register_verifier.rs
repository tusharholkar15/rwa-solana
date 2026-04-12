use anchor_lang::prelude::*;
use crate::errors::RwaError;
use crate::state::{VerifierRegistry, ProgramConfig};

/// Register a new independent legal verifier in the registry.
/// Only callable by the platform authority/admin.
pub fn handler(
    ctx: Context<RegisterVerifier>,
    name: String,
    jurisdiction_bitmask: u32,
    stake_amount: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let verifier_registry = &mut ctx.accounts.verifier_registry;

    require!(name.len() <= 64, RwaError::InvalidAmount); // Mocking name length error or use custom
    
    verifier_registry.verifier = ctx.accounts.verifier.key();
    verifier_registry.name = name;
    verifier_registry.jurisdiction_bitmask = jurisdiction_bitmask;
    verifier_registry.reputation_score = 500; // Default reputation
    verifier_registry.total_verified = 0;
    verifier_registry.total_disputed = 0;
    verifier_registry.stake_amount = stake_amount;
    verifier_registry.is_active = true;
    verifier_registry.registered_at = clock.unix_timestamp;
    verifier_registry.last_active_at = clock.unix_timestamp;
    verifier_registry.approved_by = ctx.accounts.admin.key();
    verifier_registry.bump = ctx.bumps.verifier_registry;

    msg!(
        "Verifier '{}' registered successfully by admin {}",
        verifier_registry.name,
        ctx.accounts.admin.key()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterVerifier<'info> {
    /// The admin authorized to register verifiers
    #[account(mut)]
    pub admin: Signer<'info>,

    /// The verifier wallet being registered
    /// CHECK: This is just a pubkey, not necessarily a signer here
    pub verifier: UncheckedAccount<'info>,

    /// The verifier's registry entry (PDA)
    #[account(
        init,
        payer = admin,
        space = 8 + VerifierRegistry::INIT_SPACE,
        seeds = [VerifierRegistry::SEED_PREFIX, verifier.key().as_ref()],
        bump
    )]
    pub verifier_registry: Account<'info, VerifierRegistry>,

    /// Global program configuration (proves admin rights)
    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = config.authority == admin.key() @ RwaError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}
