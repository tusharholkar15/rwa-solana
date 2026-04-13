use anchor_lang::prelude::*;

use crate::state::enums::*;

/// Escrow account for P2P trades with dispute resolution
/// PDA seeds: [b"escrow", buyer.key(), seller.key(), asset.key()]
#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    /// Buyer's wallet address
    pub buyer: Pubkey,

    /// Seller's wallet address
    pub seller: Pubkey,

    /// Asset being traded
    pub asset: Pubkey,

    /// Number of fractional tokens in escrow
    pub token_amount: u64,

    /// SOL amount locked by buyer (in lamports)
    pub sol_amount: u64,

    /// Unix timestamp after which the trade auto-settles if no dispute
    pub dispute_deadline: i64,

    /// Current escrow status
    pub status: EscrowStatus,

    /// Admin arbitrator who can resolve disputes
    pub arbitrator: Pubkey,

    /// Unix timestamp when escrow was created
    pub created_at: i64,

    /// Unix timestamp when escrow was settled/resolved
    pub settled_at: i64,

    /// Dispute reason (up to 128 bytes, UTF-8 encoded)
    #[max_len(128)]
    pub dispute_reason: String,

    /// Whether this is an institutional dark pool trade (requires match cert)
    pub is_dark_pool: bool,

    /// Hash of the match payload (Asset + Amount + Price) — verified on settlement
    pub match_hash: [u8; 32],

    /// PDA bump seed
    pub bump: u8,
}

impl EscrowAccount {
    pub const SEED_PREFIX: &'static [u8] = b"escrow";

    /// Check if the dispute window has passed
    pub fn is_dispute_window_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp >= self.dispute_deadline
    }

    /// Check if this escrow can be auto-settled
    pub fn can_auto_settle(&self, current_timestamp: i64) -> bool {
        self.status == EscrowStatus::Funded
            && self.is_dispute_window_expired(current_timestamp)
            && !self.is_settling
    }
}
