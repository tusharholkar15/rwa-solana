use anchor_lang::prelude::*;

/// Oracle Circuit Breaker — automatically pauses an asset when price feeds diverge
/// PDA seeds: [b"circuit_breaker", asset.key()]
///
/// Monitors oracle health and trips automatically when:
/// 1. Spread between Pyth and Switchboard exceeds MAX_ORACLE_SPREAD_BPS (5%)
/// 2. Three consecutive oracle failures occur
/// 3. Z-score deviation exceeds 2 standard deviations from 1-hour mean
///
/// Once tripped, only a guardian can reset it after investigation.
#[account]
#[derive(InitSpace)]
pub struct OracleCircuitBreaker {
    /// The asset this circuit breaker protects
    pub asset: Pubkey,

    /// Last validated price before the breaker tripped (in lamports)
    pub last_valid_price: u64,

    /// Unix timestamp of the last successful price update
    pub last_valid_update_at: i64,

    /// Solana slot of the last successful price update
    pub last_update_slot: u64,

    /// Running count of consecutive oracle spread breaches
    /// Automatically trips breaker when >= BREAKER_THRESHOLD
    pub consecutive_spread_breaches: u8,

    /// Running count of consecutive oracle feed failures (stale/unavailable)
    pub consecutive_failures: u8,

    /// Whether the circuit breaker is currently tripped (asset paused)
    pub is_tripped: bool,

    /// Unix timestamp when the breaker was last tripped (0 = never)
    pub tripped_at: i64,

    /// Reason code for the last trip (1=spread, 2=failure, 3=zscore, 4=manual)
    pub trip_reason: u8,

    /// Worst spread seen before trip (in BPS, for audit trail)
    pub worst_spread_bps: u16,

    /// Guardian wallet authorized to reset this breaker
    pub guardian: Pubkey,

    /// Total number of times this breaker has tripped
    pub total_trips: u32,

    /// Running Z-score window: sum of prices (for mean calculation)
    pub price_sum_1h: u64,

    /// Running Z-score window: count of price observations in window
    pub price_count_1h: u16,

    /// Last computed Z-score * 100 (e.g., 215 = 2.15 standard deviations)
    pub last_zscore_x100: u16,

    /// PDA bump seed
    pub bump: u8,
}

impl OracleCircuitBreaker {
    pub const SEED_PREFIX: &'static [u8] = b"circuit_breaker";

    /// Consecutive events before auto-trip
    pub const BREAKER_THRESHOLD: u8 = 3;

    /// Maximum oracle spread in BPS before counting as a breach (5%)
    pub const MAX_SPREAD_BPS: u16 = 500;

    /// Z-score threshold * 100 (2.0 standard deviations = 200)
    pub const MAX_ZSCORE_X100: u16 = 200;

    /// Maximum slot drift allowed for a "fresh" oracle update (150 slots ~= 1 min)
    pub const MAX_SLOT_DRIFT: u64 = 150;

    /// Trip reason codes
    pub const TRIP_REASON_SPREAD: u8 = 1;
    pub const TRIP_REASON_FAILURE: u8 = 2;
    pub const TRIP_REASON_ZSCORE: u8 = 3;
    pub const TRIP_REASON_MANUAL: u8 = 4;

    /// Check if auto-trip threshold has been reached
    pub fn should_trip_spread(&self) -> bool {
        self.consecutive_spread_breaches >= Self::BREAKER_THRESHOLD
    }

    pub fn should_trip_failure(&self) -> bool {
        self.consecutive_failures >= Self::BREAKER_THRESHOLD
    }

    pub fn should_trip_zscore(&self) -> bool {
        self.last_zscore_x100 > Self::MAX_ZSCORE_X100
    }

    /// Record a spread breach event
    pub fn record_breach(&mut self, spread_bps: u16) {
        self.consecutive_spread_breaches = self.consecutive_spread_breaches.saturating_add(1);
        if spread_bps > self.worst_spread_bps {
            self.worst_spread_bps = spread_bps;
        }
    }

    /// Record a successful oracle update (resets failure/breach counters)
    pub fn record_success(&mut self, price: u64, timestamp: i64, current_slot: u64) {
        self.consecutive_failures = 0;
        self.consecutive_spread_breaches = 0;
        self.last_valid_price = price;
        self.last_valid_update_at = timestamp;
        self.last_update_slot = current_slot;
        // Update rolling price window
        self.price_sum_1h = self.price_sum_1h.saturating_add(price);
        self.price_count_1h = self.price_count_1h.saturating_add(1);
    }

    /// Trip the circuit breaker
    pub fn trip(&mut self, reason: u8, timestamp: i64) {
        self.is_tripped = true;
        self.tripped_at = timestamp;
        self.trip_reason = reason;
        self.total_trips = self.total_trips.saturating_add(1);
    }

    /// Reset the circuit breaker (guardian only)
    pub fn reset(&mut self) {
        self.is_tripped = false;
        self.consecutive_spread_breaches = 0;
        self.consecutive_failures = 0;
        self.last_zscore_x100 = 0;
        self.worst_spread_bps = 0;
    }
}
