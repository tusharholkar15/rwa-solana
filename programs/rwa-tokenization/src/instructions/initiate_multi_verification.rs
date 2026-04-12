use anchor_lang::prelude::*;
use crate::errors::RwaError;
use crate::state::{AssetAccount, MultiVerification};

/// Initiate the multi-signature verification process for an asset.
/// Creates the MultiVerification PDA and sets the threshold (default 2-of-3).
pub fn handler(
    ctx: Context<InitiateMultiVerification>,
    legal_doc_hash: [u8; 32],
    attestation_hash: [u8; 32],
    ipfs_cid: String,
) -> Result<()> {
    let clock = Clock::get()?;
    let multi_verify = &mut ctx.accounts.multi_verification;

    multi_verify.asset = ctx.accounts.asset.key();
    multi_verify.verifier_1 = Pubkey::default(); // Will be set by first signer
    multi_verify.verifier_2 = Pubkey::default();
    multi_verify.verifier_3 = Pubkey::default();
    multi_verify.approval_bitmask = 0;
    multi_verify.approval_count = 0;
    multi_verify.threshold = MultiVerification::DEFAULT_THRESHOLD;
    multi_verify.legal_doc_hash = legal_doc_hash;
    multi_verify.attestation_hash = attestation_hash;
    multi_verify.ipfs_cid = ipfs_cid;
    multi_verify.initiated_at = clock.unix_timestamp;
    multi_verify.completed_at = 0;
    multi_verify.is_superseded = false;
    multi_verify.bump = ctx.bumps.multi_verification;

    msg!(
        "Multi-verification initiated for asset '{}' with threshold {}",
        ctx.accounts.asset.name,
        multi_verify.threshold
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitiateMultiVerification<'info> {
    /// The asset authority initiating verification
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The asset to be verified
    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The MultiVerification record (PDA)
    #[account(
        init,
        payer = authority,
        space = 8 + MultiVerification::INIT_SPACE,
        seeds = [MultiVerification::SEED_PREFIX, asset.key().as_ref()],
        bump
    )]
    pub multi_verification: Account<'info, MultiVerification>,

    pub system_program: Program<'info, System>,
}
