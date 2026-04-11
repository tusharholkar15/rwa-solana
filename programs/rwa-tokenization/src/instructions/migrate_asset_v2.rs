use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{AssetAccount, AssetLifecycleStatus};

/// Migrate an existing v1 AssetAccount to v2 format
/// Sets safe defaults for all new fields. Admin-only, one-time per asset.
pub fn handler(ctx: Context<MigrateAssetV2>) -> Result<()> {
    let asset = &mut ctx.accounts.asset;

    // Only migrate v1 → v2 (prevent double migration)
    require!(asset.version < AssetAccount::CURRENT_VERSION, RwaError::InvalidLifecycleStatus);

    // Only authority can migrate
    require!(
        ctx.accounts.authority.key() == asset.authority,
        RwaError::Unauthorized
    );

    // Set safe defaults for all v2 fields
    asset.lifecycle_status = if asset.is_active {
        AssetLifecycleStatus::Active
    } else {
        AssetLifecycleStatus::Paused
    };

    asset.verification_hash = [0u8; 32];
    asset.approved_by = asset.authority; // Self-approved for legacy assets
    asset.fraud_score = 0;
    asset.legal_doc_count = 0;
    asset.min_compliance_tier = 1; // Basic KYC default
    asset.allowed_jurisdictions = 0xFFFFFFFF; // All jurisdictions
    asset.occupancy_rate = 0;
    asset.last_inspection_at = 0;
    asset.oracle_source = 0;
    asset.switchboard_feed = Pubkey::default();
    asset.has_liquidity_pool = false;
    asset.version = AssetAccount::CURRENT_VERSION;

    msg!(
        "Asset '{}' migrated to v{} — lifecycle={:?}",
        asset.name,
        AssetAccount::CURRENT_VERSION,
        asset.lifecycle_status
    );

    Ok(())
}

#[derive(Accounts)]
pub struct MigrateAssetV2<'info> {
    /// The asset authority
    pub authority: Signer<'info>,

    /// The asset to migrate
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    pub system_program: Program<'info, System>,
}
