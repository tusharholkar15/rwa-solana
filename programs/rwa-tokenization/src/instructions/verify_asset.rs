use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{AssetAccount, AssetLifecycleStatus, VerificationRegistry};

/// Verify an asset — transitions from Pending/UnderReview → Verified
/// Only callable by a registered verifier.
pub fn handler(
    ctx: Context<VerifyAsset>,
    doc_hash: [u8; 32],
    fraud_score: u8,
    legal_doc_count: u8,
) -> Result<()> {
    let clock = Clock::get()?;
    let verifier_registry = &ctx.accounts.verifier_registry;
    let asset = &mut ctx.accounts.asset;

    // Validate verifier is registered and active
    require!(
        verifier_registry.is_valid(clock.unix_timestamp),
        RwaError::InvalidVerifier
    );

    // Validate asset is in a verifiable state
    require!(
        asset.lifecycle_status == AssetLifecycleStatus::Pending
            || asset.lifecycle_status == AssetLifecycleStatus::UnderReview,
        RwaError::InvalidLifecycleStatus
    );

    // Validate fraud score is within verifier's authority
    require!(
        fraud_score <= verifier_registry.max_fraud_score,
        RwaError::FraudScoreTooHigh
    );

    // Update asset verification data
    asset.verification_hash = doc_hash;
    asset.fraud_score = fraud_score;
    asset.legal_doc_count = legal_doc_count;
    asset.approved_by = ctx.accounts.verifier.key();
    asset.last_inspection_at = clock.unix_timestamp;

    // Transition lifecycle: if fraud score is acceptable, mark as Verified
    if fraud_score <= 30 {
        asset.lifecycle_status = AssetLifecycleStatus::Verified;
        msg!(
            "Asset '{}' VERIFIED by {} (fraud_score={}, docs={})",
            asset.name,
            ctx.accounts.verifier.key(),
            fraud_score,
            legal_doc_count
        );
    } else {
        // High fraud score — stays in UnderReview for admin escalation
        asset.lifecycle_status = AssetLifecycleStatus::UnderReview;
        msg!(
            "Asset '{}' flagged for review (fraud_score={})",
            asset.name,
            fraud_score
        );
    }

    // Update verifier stats
    let verifier_registry = &mut ctx.accounts.verifier_registry;
    verifier_registry.assets_verified = verifier_registry
        .assets_verified
        .checked_add(1)
        .ok_or(RwaError::ArithmeticOverflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct VerifyAsset<'info> {
    /// The verifier (must match a VerificationRegistry entry)
    #[account(mut)]
    pub verifier: Signer<'info>,

    /// The asset to verify
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Verifier's registry entry (proves they're authorized)
    #[account(
        mut,
        seeds = [VerificationRegistry::SEED_PREFIX, verifier.key().as_ref()],
        bump = verifier_registry.bump,
        constraint = verifier_registry.verifier == verifier.key() @ RwaError::Unauthorized,
    )]
    pub verifier_registry: Account<'info, VerificationRegistry>,

    pub system_program: Program<'info, System>,
}
