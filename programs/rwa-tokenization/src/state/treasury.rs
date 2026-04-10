use anchor_lang::prelude::*;

/// Treasury vault associated with an asset
/// Holds SOL from token sales and manages yield distribution
/// PDA seeds: [b"treasury", asset.key()]
#[account]
#[derive(InitSpace)]
pub struct TreasuryVault {
    /// The asset this treasury belongs to
    pub asset: Pubkey,

    /// Authority that can withdraw/distribute from treasury
    pub authority: Pubkey,

    /// Total SOL collected from token sales (in lamports)
    pub total_collected: u64,

    /// Total SOL distributed as yield (in lamports)
    pub total_yield_distributed: u64,

    /// Total SOL withdrawn by authority (in lamports)
    pub total_withdrawn: u64,

    /// Current balance available for yield distribution (in lamports)
    pub available_for_yield: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl TreasuryVault {
    pub const SEED_PREFIX: &'static [u8] = b"treasury";
}
