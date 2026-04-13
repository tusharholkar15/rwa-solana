use anchor_lang::prelude::*;

/// Global program configuration PDA
/// PDA seeds: [b"config"]
///
/// Stores platform-level settings that can be updated by the upgrade authority.
/// Acts as a circuit breaker and protocol fee controller.
#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    /// Upgrade authority (should be a multisig, e.g., Squads v4)
    pub upgrade_authority: Pubkey,

    /// Program version number — incremented on each upgrade
    pub version: u8,

    /// Emergency circuit breaker — pauses ALL trading when true
    pub emergency_pause: bool,

    /// Global minimum compliance tier for any trade
    pub min_compliance_tier: u8,

    /// Platform protocol fee in basis points (e.g., 10 = 0.1%)
    pub protocol_fee_bps: u16,

    /// Treasury address where protocol fees are collected
    pub fee_treasury: Pubkey,

    /// Public key authorized to sign Dark Pool match certificates
    pub dark_pool_matching_authority: Pubkey,

    /// Max slippage allowed for auto-compounding swaps (BPS, e.g. 50 = 0.5%)
    pub compounding_slippage_bps: u16,

    /// Fee paid to the 'harvester' account for triggering a compound (BPS, e.g. 100 = 1%)
    pub harvesting_fee_bps: u16,

    /// Maximum oracle price staleness allowed (in seconds)
    pub max_oracle_staleness: u64,

    /// Maximum spread between oracles before manipulation guard triggers (BPS)
    pub max_oracle_spread_bps: u16,

    /// Whether the DAO governance module is enabled
    pub governance_enabled: bool,

    /// Whether the AMM secondary market is enabled
    pub amm_enabled: bool,

    /// Whether the escrow module is enabled
    pub escrow_enabled: bool,

    /// Total number of assets created on the platform
    pub total_assets: u64,

    /// Total number of unique whitelisted users
    pub total_users: u64,

    /// Total SOL volume traded on the platform (in lamports)
    pub total_volume: u128,

    /// PDA bump seed
    pub bump: u8,
}

impl ProgramConfig {
    pub const SEED_PREFIX: &'static [u8] = b"config";

    /// Check if the platform is operational
    pub fn is_operational(&self) -> bool {
        !self.emergency_pause
    }
}
