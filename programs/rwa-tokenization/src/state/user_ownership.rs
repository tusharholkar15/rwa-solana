use anchor_lang::prelude::*;

/// Tracks a user's ownership of fractional tokens for a specific asset
/// PDA seeds: [b"ownership", asset.key(), owner.key()]
#[account]
#[derive(InitSpace)]
pub struct UserOwnership {
    /// The user's wallet address
    pub owner: Pubkey,

    /// The asset this ownership record is for
    pub asset: Pubkey,

    /// Number of fractional tokens owned
    pub shares_owned: u64,

    /// Volume-weighted average purchase price (in lamports per token)
    pub avg_purchase_price: u64,

    /// Total SOL invested (in lamports)
    pub total_invested: u64,

    /// Total yield received (in lamports)
    pub total_yield_received: u64,

    /// Unix timestamp of first purchase
    pub first_purchase_at: i64,

    /// Unix timestamp of last transaction
    pub last_transaction_at: i64,

    /// Slot number when tokens were last acquired (via buy or transfer).
    /// Used as a flash-loan guard in governance voting — must be at least
    /// MIN_TOKEN_HOLD_SLOTS before the current slot to be eligible to vote.
    pub last_acquired_slot: u64,

    /// PDA bump seed
    pub bump: u8,

    /// ═══════════════════════════════════════════════════════
    /// YIELD V2 — Scalable Distribution
    /// ═══════════════════════════════════════════════════════

    /// Amount of yield NOT claimable by the user (lamports * 10^12)
    pub yield_debt: u128,

    /// Yield realized during trade events but not yet withdrawn (in lamports)
    pub unclaimed_yield_lamports: u64,

    /// Whether the user wants their yield automatically reinvested into shares
    pub auto_compound_enabled: bool,

    /// Minimum SOL (lamports) accrued before auto-compounding is triggered
    pub min_compound_threshold: u64,
}

impl UserOwnership {
    pub const SEED_PREFIX: &'static [u8] = b"ownership";

    /// Calculate the new weighted average price after a purchase
    pub fn calculate_new_avg_price(
        &self,
        additional_shares: u64,
        price_per_share: u64,
    ) -> Option<u64> {
        let existing_value = self.shares_owned.checked_mul(self.avg_purchase_price)?;
        let new_value = additional_shares.checked_mul(price_per_share)?;
        let total_value = existing_value.checked_add(new_value)?;
        let total_shares = self.shares_owned.checked_add(additional_shares)?;

        if total_shares == 0 {
            return Some(0);
        }

        total_value.checked_div(total_shares)
    }

    /// Record a share acquisition (buy or transfer)
    /// Atomically updates shares, avg price, last transaction, and governance lock-slot.
    pub fn record_acquisition(
        &mut self,
        amount: u64,
        price_per_share: u64,
        slot: u64,
        timestamp: i64,
    ) -> Result<()> {
        if self.shares_owned > 0 {
            self.avg_purchase_price = self
                .calculate_new_avg_price(amount, price_per_share)
                .ok_or(error!(crate::errors::RwaError::ArithmeticOverflow))?;
        } else {
            self.avg_purchase_price = price_per_share;
        }

        self.shares_owned = self
            .shares_owned
            .checked_add(amount)
            .ok_or(error!(crate::errors::RwaError::ArithmeticOverflow))?;
            
        self.last_transaction_at = timestamp;
        self.last_acquired_slot = slot;
        
        Ok(())
    }
}
