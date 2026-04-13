use anchor_lang::prelude::*;

/// Whitelist of approved DeFi protocols or strategies for treasury reinvestment.
/// PDA seeds: [b"strategy_whitelist", strategy_address]
#[account]
#[derive(InitSpace)]
pub struct ReinvestmentWhitelist {
    /// The address of the protocol / strategy vault
    pub strategy_address: Pubkey,
    
    /// Descriptive name (e.g., "Jito SOL Staking")
    #[max_len(32)]
    pub name: String,
    
    /// Whether this strategy is currently active
    pub is_active: bool,
    
    /// Risk level (1-10, where 1 is low risk like native staking)
    pub risk_level: u8,
    
    /// Admin who added this to the whitelist
    pub added_by: Pubkey,
    
    /// Timestamp when added
    pub added_at: i64,
    
    /// PDA bump
    pub bump: u8,
}

impl ReinvestmentWhitelist {
    pub const SEED_PREFIX: &'static [u8] = b"strategy_whitelist";
}
