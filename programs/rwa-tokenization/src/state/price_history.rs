use anchor_lang::prelude::*;

/// On-chain price history ring buffer for TWAP calculations
/// PDA seeds: [b"price_history", asset.key()]
///
/// Stores the last 48 price updates as a circular buffer.
/// Used as a fallback when both Pyth and Switchboard are stale.
#[account]
#[derive(InitSpace)]
pub struct PriceHistory {
    /// The asset this price history belongs to
    pub asset: Pubkey,

    /// Ring buffer of price entries (48 entries)
    /// Each entry is a packed (price: u64, timestamp: i64) = 16 bytes
    /// Total: 48 * 16 = 768 bytes
    pub prices: [u64; 48],
    pub timestamps: [i64; 48],

    /// Current write index (0–47, wraps around)
    pub head: u8,

    /// Number of entries filled (0–48)
    pub count: u8,

    /// PDA bump seed
    pub bump: u8,
}

impl PriceHistory {
    pub const SEED_PREFIX: &'static [u8] = b"price_history";
    pub const MAX_ENTRIES: u8 = 48;

    /// Push a new price entry into the ring buffer
    pub fn push(&mut self, price: u64, timestamp: i64) {
        let idx = self.head as usize;
        self.prices[idx] = price;
        self.timestamps[idx] = timestamp;
        self.head = (self.head + 1) % Self::MAX_ENTRIES;
        if self.count < Self::MAX_ENTRIES {
            self.count += 1;
        }
    }

    /// Calculate TWAP (Time-Weighted Average Price) over the last N entries
    /// Returns None if no entries are available
    pub fn compute_twap(&self, max_entries: u8) -> Option<u64> {
        if self.count == 0 {
            return None;
        }

        let entries_to_use = max_entries.min(self.count) as usize;
        let mut total_price: u128 = 0;
        let mut total_weight: u128 = 0;

        for i in 0..entries_to_use {
            // Walk backward from head
            let idx = if self.head as usize >= i + 1 {
                self.head as usize - i - 1
            } else {
                Self::MAX_ENTRIES as usize - (i + 1 - self.head as usize)
            };

            let price = self.prices[idx] as u128;
            // Weight more recent prices higher (simple linear weighting)
            let weight = (entries_to_use - i) as u128;
            total_price = total_price.checked_add(price.checked_mul(weight)?)?;
            total_weight = total_weight.checked_add(weight)?;
        }

        if total_weight == 0 {
            return None;
        }

        Some((total_price / total_weight) as u64)
    }

    /// Get the most recent price
    pub fn latest_price(&self) -> Option<u64> {
        if self.count == 0 {
            return None;
        }
        let idx = if self.head == 0 {
            Self::MAX_ENTRIES as usize - 1
        } else {
            (self.head - 1) as usize
        };
        Some(self.prices[idx])
    }

    /// Get the most recent timestamp
    pub fn latest_timestamp(&self) -> Option<i64> {
        if self.count == 0 {
            return None;
        }
        let idx = if self.head == 0 {
            Self::MAX_ENTRIES as usize - 1
        } else {
            (self.head - 1) as usize
        };
        Some(self.timestamps[idx])
    }
}
