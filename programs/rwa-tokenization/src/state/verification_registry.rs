use anchor_lang::prelude::*;

/// Verification registry — maps verifier public keys to their approval scope
/// PDA seeds: [b"verifier", verifier.key()]
///
/// Only wallets with a VerificationRegistry entry can approve assets.
/// Prevents single-admin bottleneck by distributing verification rights.
#[account]
#[derive(InitSpace)]
pub struct VerificationRegistry {
    /// The verifier's wallet address
    pub verifier: Pubkey,

    /// Human-readable name of the verifier / verification firm
    #[max_len(64)]
    pub name: String,

    /// Whether this verifier is currently active
    pub is_active: bool,

    /// Number of assets this verifier has approved
    pub assets_verified: u64,

    /// Number of assets this verifier has rejected
    pub assets_rejected: u64,

    /// Maximum fraud score this verifier can assign (prevents rogue verifiers)
    pub max_fraud_score: u8,

    /// Who granted this verifier their role (must be program authority)
    pub granted_by: Pubkey,

    /// Unix timestamp when the verifier role was granted
    pub granted_at: i64,

    /// Unix timestamp when the verifier role expires (0 = no expiry)
    pub expires_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl VerificationRegistry {
    pub const SEED_PREFIX: &'static [u8] = b"verifier";

    /// Check if this verifier is valid
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.is_active
            && (self.expires_at == 0 || current_timestamp < self.expires_at)
    }
}
