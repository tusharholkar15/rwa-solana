use anchor_lang::prelude::*;

/// USDC Rent Collection Vault — holds real rental income for yield distribution
/// PDA seeds: [b"rent_vault", asset.key()]
///
/// A property manager deposits USDC here periodically (monthly rent),
/// which is then distributed pro-rata to all token holders.
#[account]
#[derive(InitSpace)]
pub struct RentVault {
    /// The asset (property) this vault belongs to
    pub asset: Pubkey,

    /// USDC SPL token mint (mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
    pub usdc_mint: Pubkey,

    /// Program-owned USDC token account (holds the actual USDC)
    pub vault_token_account: Pubkey,

    /// Authorized property manager who can deposit rent
    pub property_manager: Pubkey,

    /// Total USDC ever deposited (in USDC micro-units, 6 decimals)
    pub total_collected: u64,

    /// Total USDC ever distributed to token holders
    pub total_distributed: u64,

    /// USDC pending the next distribution cycle (not yet sent to holders)
    pub pending_distribution: u64,

    /// Unix timestamp of last successful rent collection
    pub last_collection_at: i64,

    /// Unix timestamp of last yield distribution
    pub last_distribution_at: i64,

    /// Expected distribution frequency in seconds (e.g., 30 * 24 * 3600 = monthly)
    pub distribution_frequency: i64,

    /// Reserve buffer (USDC): 3-month rent held as insurance
    /// Cannot be distributed — only released by DAO governance vote
    pub reserve_buffer: u64,

    /// Number of successful rent collections
    pub collection_count: u32,

    /// Number of yield distributions executed
    pub distribution_count: u32,

    /// Whether rent collection is currently paused (e.g., vacancy)
    pub is_paused: bool,

    /// PDA bump seed
    pub bump: u8,
}

impl RentVault {
    pub const SEED_PREFIX: &'static [u8] = b"rent_vault";

    /// Minimum reserve: 3 months of average rent
    pub const RESERVE_MONTHS: u32 = 3;

    /// Protocol distribution fee: 0.5% of distributed yield
    pub const DISTRIBUTION_FEE_BPS: u16 = 50;

    /// Check if a distribution is due
    pub fn is_distribution_due(&self, current_timestamp: i64) -> bool {
        !self.is_paused
            && self.pending_distribution > 0
            && current_timestamp >= self.last_distribution_at + self.distribution_frequency
    }

    /// Calculate fee-adjusted distribution amount
    pub fn net_distribution_amount(&self) -> Option<u64> {
        let fee = (self.pending_distribution as u128)
            .checked_mul(Self::DISTRIBUTION_FEE_BPS as u128)?
            .checked_div(10_000)?;
        self.pending_distribution.checked_sub(fee as u64)
    }
}
