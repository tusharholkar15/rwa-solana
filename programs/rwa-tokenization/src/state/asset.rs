use anchor_lang::prelude::*;

/// Represents a tokenized real-world asset (e.g., a property)
/// PDA seeds: [b"asset", authority.key(), name.as_bytes()]
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
}

impl AssetAccount {
    /// Calculate space needed for the account (Anchor's InitSpace handles this via derive)
    pub const SEED_PREFIX: &'static [u8] = b"asset";
}
