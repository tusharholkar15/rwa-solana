use anchor_lang::prelude::*;

use crate::state::enums::*;

/// On-chain limit order for the order book
/// PDA seeds: [b"order", maker.key(), asset.key(), order_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct TradeOrder {
    /// Maker (the user who placed the order)
    pub maker: Pubkey,

    /// Asset being traded
    pub asset: Pubkey,

    /// Order type: Bid (buy) or Ask (sell)
    pub order_type: OrderType,

    /// Limit price per token (in lamports)
    pub price: u64,

    /// Total quantity of tokens in the order
    pub quantity: u64,

    /// Quantity already filled
    pub filled_quantity: u64,

    /// SOL locked in escrow for bid orders (in lamports)
    pub escrow_lamports: u64,

    /// Tokens locked in escrow for ask orders
    pub escrow_tokens: u64,

    /// Order status
    pub status: OrderStatus,

    /// Unique order ID (incremented per user)
    pub order_id: u64,

    /// Unix timestamp when the order was placed
    pub created_at: i64,

    /// Unix timestamp when the order expires (0 = no expiry / GTC)
    pub expires_at: i64,

    /// Unix timestamp when the order was last updated
    pub last_updated_at: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl TradeOrder {
    pub const SEED_PREFIX: &'static [u8] = b"order";

    /// How many tokens remain to be filled
    pub fn remaining_quantity(&self) -> u64 {
        self.quantity.saturating_sub(self.filled_quantity)
    }

    /// Check if the order is still active
    pub fn is_active(&self, current_timestamp: i64) -> bool {
        matches!(self.status, OrderStatus::Open | OrderStatus::PartiallyFilled)
            && (self.expires_at == 0 || current_timestamp < self.expires_at)
    }

    /// Check if the order is fully filled
    pub fn is_filled(&self) -> bool {
        self.filled_quantity >= self.quantity
    }

    /// Calculate the total value of unfilled portion (in lamports)
    pub fn remaining_value(&self) -> Option<u64> {
        self.remaining_quantity().checked_mul(self.price)
    }
}
