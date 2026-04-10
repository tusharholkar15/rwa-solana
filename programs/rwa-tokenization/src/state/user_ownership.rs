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

    /// PDA bump seed
    pub bump: u8,
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
}
