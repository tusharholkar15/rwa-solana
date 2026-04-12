use anchor_lang::prelude::*;

use crate::state::enums::*;

/// Whitelist entry for a KYC-verified user
/// PDA seeds: [b"whitelist", user.key()]
///
/// V2: Extended with RBAC roles, compliance tiers, jurisdiction,
///     AML flags, and investment limits for institutional compliance.
#[account]
#[derive(InitSpace)]
pub struct WhitelistEntry {
    /// The whitelisted user's wallet address
    pub user: Pubkey,

    /// Whether the user is currently verified
    pub is_verified: bool,

    /// The authority who verified this user (platform admin)
    pub verified_by: Pubkey,

    /// The secondary compliance verifier who audited the KYC (e.g., law firm, KYC provider)
    pub secondary_verified_by: Pubkey,

    /// Unix timestamp of verification
    pub verified_at: i64,

    /// Unix timestamp of expiry (0 = no expiry)
    pub expires_at: i64,

    /// PDA bump seed
    pub bump: u8,

    // ═══════════════════════════════════════════════════════
    // V2 FIELDS — Institutional Compliance
    // ═══════════════════════════════════════════════════════

    /// User's role: Investor, Issuer, Admin, Auditor
    pub role: UserRole,

    /// ISO 3166-1 numeric country code (e.g., 840 = US, 702 = SG, 826 = UK)
    /// Stored as u16 for compact representation. 0 = unspecified/global.
    pub jurisdiction: u16,

    /// Compliance tier: 0=unverified, 1=basic KYC, 2=accredited, 3=institutional
    pub compliance_tier: u8,

    /// Unix timestamp of last AML screening
    pub aml_cleared_at: i64,

    /// AML screening flags bitmask
    /// Bit 0: PEP (Politically Exposed Person)
    /// Bit 1: Sanctions list match
    /// Bit 2: Adverse media
    /// 0 = all clear
    pub aml_flags: u8,

    /// Maximum lamports allowed per single transaction (0 = unlimited)
    pub investment_limit: u64,

    /// Total lamports invested across all assets (for aggregate limit checks)
    pub total_invested: u64,

    /// Number of assets the user currently holds positions in
    pub active_positions: u16,

    /// Version number for forward-compatible migration
    pub version: u8,
}

impl WhitelistEntry {
    pub const SEED_PREFIX: &'static [u8] = b"whitelist";
    pub const CURRENT_VERSION: u8 = 2;

    /// Check if the whitelist entry is valid (verified, not expired, no AML flags)
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.is_verified
            && (self.expires_at == 0 || current_timestamp < self.expires_at)
            && self.aml_flags == 0
    }

    /// Check if user has minimum required compliance tier
    pub fn meets_tier(&self, required_tier: u8) -> bool {
        self.compliance_tier >= required_tier
    }

    /// Check if user is an admin
    pub fn is_admin(&self) -> bool {
        self.role == UserRole::Admin
    }

    /// Check if user is an issuer or admin
    pub fn is_issuer_or_admin(&self) -> bool {
        self.role == UserRole::Issuer || self.role == UserRole::Admin
    }

    /// Check if investment is within limits (returns true if no limit set)
    pub fn is_within_limit(&self, amount: u64) -> bool {
        if self.investment_limit == 0 {
            return true; // No limit
        }
        amount <= self.investment_limit
    }
}
