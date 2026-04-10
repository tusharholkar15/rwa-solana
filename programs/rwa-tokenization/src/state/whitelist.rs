use anchor_lang::prelude::*;

/// Whitelist entry for a KYC-verified user
/// PDA seeds: [b"whitelist", user.key()]
#[account]
#[derive(InitSpace)]
pub struct WhitelistEntry {
    /// The whitelisted user's wallet address
    pub user: Pubkey,

    /// Whether the user is currently verified
    pub is_verified: bool,

    /// The authority who verified this user
    pub verified_by: Pubkey,

    /// Unix timestamp of verification
    pub verified_at: i64,

    /// Unix timestamp of expiry (0 = no expiry)
    pub expires_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl WhitelistEntry {
    pub const SEED_PREFIX: &'static [u8] = b"whitelist";

    /// Check if the whitelist entry is valid (verified and not expired)
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.is_verified
            && (self.expires_at == 0 || current_timestamp < self.expires_at)
    }
}
