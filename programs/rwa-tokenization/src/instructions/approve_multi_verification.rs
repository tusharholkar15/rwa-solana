use anchor_lang::prelude::*;
use crate::errors::RwaError;
use crate::state::{AssetAccount, MultiVerification, VerifierRegistry, AssetLifecycleStatus};

/// Allows a registered verifier to sign off on an initiated multi-verification request.
/// Once the threshold (e.g. 2-of-3) is met, the asset status is updated.
pub fn handler(ctx: Context<ApproveMultiVerification>) -> Result<()> {
    let clock = Clock::get()?;
    let multi_verify = &mut ctx.accounts.multi_verification;
    let verifier_registry = &ctx.accounts.verifier_registry;

    // Validate verifier is active and has enough stake/reputation
    require!(verifier_registry.can_verify(), RwaError::InvalidVerifier);

    // Ensure verifier hasn't already signed
    let verifier_key = ctx.accounts.verifier.key();
    require!(
        multi_verify.verifier_1 != verifier_key && 
        multi_verify.verifier_2 != verifier_key && 
        multi_verify.verifier_3 != verifier_key,
        RwaError::Unauthorized
    );

    // Assign to an open slot and record approval
    if multi_verify.verifier_1 == Pubkey::default() {
        multi_verify.verifier_1 = verifier_key;
        multi_verify.add_approval(0);
    } else if multi_verify.verifier_2 == Pubkey::default() {
        multi_verify.verifier_2 = verifier_key;
        multi_verify.add_approval(1);
    } else if multi_verify.verifier_3 == Pubkey::default() {
        multi_verify.verifier_3 = verifier_key;
        multi_verify.add_approval(2);
    } else {
        return Err(RwaError::InvalidAmount.into()); // All slots full
    }

    // Update verifier stats
    let verifier_registry = &mut ctx.accounts.verifier_registry;
    verifier_registry.total_verified = verifier_registry.total_verified.saturating_add(1);
    verifier_registry.last_active_at = clock.unix_timestamp;

    // Check if threshold is met
    if multi_verify.is_approved() && multi_verify.completed_at == 0 {
        multi_verify.completed_at = clock.unix_timestamp;
        
        // Transition asset status to Verified
        let asset = &mut ctx.accounts.asset;
        asset.lifecycle_status = AssetLifecycleStatus::Verified;
        asset.last_inspection_at = clock.unix_timestamp;
        
        msg!(
            "Multi-verification COMPLETED for asset '{}'. Threshold met!",
            asset.name
        );
    }

    Ok(())
}

#[derive(Accounts)]
pub struct ApproveMultiVerification<'info> {
    /// The independent verifier signing off
    #[account(mut)]
    pub verifier: Signer<'info>,

    /// The asset being verified
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The MultiVerification record to sign
    #[account(
        mut,
        seeds = [MultiVerification::SEED_PREFIX, asset.key().as_ref()],
        bump = multi_verification.bump,
        constraint = !multi_verification.is_superseded @ RwaError::InvalidLifecycleStatus,
    )]
    pub multi_verification: Account<'info, MultiVerification>,

    /// The verifier's registry entry
    #[account(
        mut,
        seeds = [VerifierRegistry::SEED_PREFIX, verifier.key().as_ref()],
        bump = verifier_registry.bump,
    )]
    pub verifier_registry: Account<'info, VerifierRegistry>,

    pub system_program: Program<'info, System>,
}
