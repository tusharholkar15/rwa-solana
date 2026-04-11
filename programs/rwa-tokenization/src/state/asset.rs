use anchor_lang::prelude::*;

use crate::state::enums::*;

/// Represents a tokenized real-world asset (e.g., a property)
/// PDA seeds: [b"asset", authority.key(), name.as_bytes()]
///
/// V2: Extended with lifecycle management, compliance tiers, oracle redundancy,
///     property health tracking, and governance configuration.
#[account]
#[derive(InitSpace)]
pub struct AssetAccount {
    /// The admin/authority who created this asset
    pub authority: Pubkey,

    /// Human-readable name of the asset (e.g., "Sunset Villas Unit 4B")
    #[max_len(64)]
    pub name: String,

    /// Token symbol (e.g., "SVILLA")
    #[max_len(10)]
    pub symbol: String,

    /// Metadata URI (points to off-chain JSON with images, docs, etc.)
    #[max_len(200)]
    pub uri: String,

    /// The SPL token mint for fractional ownership
    pub mint: Pubkey,

    /// Total number of fractional tokens (fixed at creation)
    pub total_supply: u64,

    /// Number of tokens still available for purchase
    pub available_supply: u64,

    /// Current price per token in lamports (1 SOL = 1_000_000_000 lamports)
    pub price_per_token: u64,

    /// Annual yield in basis points (e.g., 850 = 8.50%)
    pub annual_yield_bps: u16,

    /// Total yield distributed to date (in lamports)
    pub total_yield_distributed: u64,

    /// Pyth oracle price feed ID (32 bytes, hex-decoded)
    pub oracle_feed_id: [u8; 32],

    /// Whether this asset is currently active for trading
    pub is_active: bool,

    /// Unix timestamp when the asset was created
    pub created_at: i64,

    /// Unix timestamp of last price update
    pub last_price_update: i64,

    /// PDA bump seed
    pub bump: u8,

    // ═══════════════════════════════════════════════════════
    // V2 FIELDS — Institutional Upgrade
    // ═══════════════════════════════════════════════════════

    /// Lifecycle status: Pending → Verified → Tokenized → Active → Sold
    pub lifecycle_status: AssetLifecycleStatus,

    /// SHA-256 hash of the consolidated legal document package
    pub verification_hash: [u8; 32],

    /// Public key of the verifier who approved this asset
    pub approved_by: Pubkey,

    /// Fraud risk score (0 = low risk, 100 = high risk). Must be ≤ 30 to activate.
    pub fraud_score: u8,

    /// Number of legal documents verified on-chain
    pub legal_doc_count: u8,

    /// Minimum compliance tier required to trade this asset
    pub min_compliance_tier: u8,

    /// Allowed jurisdictions bitmask (up to 32 jurisdictions, each bit = 1 jurisdiction)
    /// Bit 0: US, Bit 1: EU, Bit 2: SG, Bit 3: UK, etc.
    /// 0xFFFFFFFF = all jurisdictions allowed
    pub allowed_jurisdictions: u32,

    /// Occupancy rate (0–100%) — updated by property lifecycle service
    pub occupancy_rate: u8,

    /// Unix timestamp of last property inspection
    pub last_inspection_at: i64,

    /// Oracle source bitmask for the last price update
    pub oracle_source: u8,

    /// Switchboard aggregator feed key (second oracle)
    pub switchboard_feed: Pubkey,

    /// Whether a liquidity pool exists for this asset
    pub has_liquidity_pool: bool,

    /// Version number for forward-compatible migration
    pub version: u8,
}

impl AssetAccount {
    /// Calculate space needed for the account (Anchor's InitSpace handles this via derive)
    pub const SEED_PREFIX: &'static [u8] = b"asset";
    pub const CURRENT_VERSION: u8 = 2;

    /// Check if asset is in a tradeable lifecycle state
    pub fn is_tradeable(&self) -> bool {
        self.is_active && self.lifecycle_status == AssetLifecycleStatus::Active
    }

    /// Check if a jurisdiction bit is set
    pub fn is_jurisdiction_allowed(&self, jurisdiction_bit: u8) -> bool {
        if self.allowed_jurisdictions == 0xFFFFFFFF {
            return true; // All jurisdictions allowed
        }
        (self.allowed_jurisdictions >> jurisdiction_bit) & 1 == 1
    }
}
