use anchor_lang::prelude::*;

/// On-chain AMM liquidity pool for secondary market trading
/// PDA seeds: [b"pool", asset.key()]
///
/// Uses constant-product formula (x * y = k) for price discovery.
/// Includes anti-whale protections and configurable fee structure.
#[account]
#[derive(InitSpace)]
pub struct LiquidityPool {
    /// The asset this pool provides liquidity for
    pub asset: Pubkey,

    /// Number of fractional tokens currently in the pool
    pub token_reserve: u64,

    /// SOL (in lamports) currently in the pool
    pub sol_reserve: u64,

    /// SPL token mint for LP (Liquidity Provider) tokens
    pub lp_mint: Pubkey,

    /// Total LP tokens minted (tracks proportional ownership)
    pub total_lp_supply: u64,

    /// Swap fee in basis points (e.g., 30 = 0.30%)
    pub fee_bps: u16,

    /// Total fees collected in SOL (lamports) — available for protocol withdrawal
    pub collected_fees_sol: u64,

    /// Total fees collected in tokens — available for protocol withdrawal
    pub collected_fees_token: u64,

    /// Pool administrator (can update fee, pause, withdraw protocol fees)
    pub authority: Pubkey,

    /// Percentage of the swap fee routed to the DAO Treasury (in BPS, e.g. 2000 = 20% of fee)
    pub dao_fee_share_bps: u16,

    /// Cumulative SOL fees routed to the DAO Treasury (in lamports)
    pub total_dao_fees_sol: u64,

    /// Whether the pool is currently active for swaps
    pub is_active: bool,

    /// Constant product invariant k = token_reserve * sol_reserve
    /// Stored for validation after each swap
    pub last_k: u128,

    /// 24-hour rolling volume in SOL (lamports) — updated by indexer
    pub volume_24h_sol: u64,

    /// Total value locked = sol_reserve * 2 (in lamports)
    pub tvl: u64,

    /// Unix timestamp of last swap
    pub last_swap_at: i64,

    /// Total number of swaps executed
    pub total_swaps: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl LiquidityPool {
    pub const SEED_PREFIX: &'static [u8] = b"pool";

    /// Calculate constant product k
    pub fn compute_k(&self) -> u128 {
        (self.token_reserve as u128) * (self.sol_reserve as u128)
    }

    /// Get the current implied price (SOL per token, in lamports)
    pub fn get_price(&self) -> Option<u64> {
        if self.token_reserve == 0 {
            return None;
        }
        Some(self.sol_reserve.checked_div(self.token_reserve)?)
    }

    /// Calculate output amount for a swap using constant product formula
    /// dy = (y * dx) / (x + dx) where:
    ///   dx = input amount (after fee)
    ///   x  = input reserve
    ///   y  = output reserve
    pub fn calculate_swap_output(
        &self,
        amount_in: u64,
        is_token_to_sol: bool,
    ) -> Option<(u64, u64)> {
        let (input_reserve, output_reserve) = if is_token_to_sol {
            (self.token_reserve, self.sol_reserve)
        } else {
            (self.sol_reserve, self.token_reserve)
        };

        // Apply fee: effective_input = amount_in * (10000 - fee_bps) / 10000
        let fee_amount = (amount_in as u128)
            .checked_mul(self.fee_bps as u128)?
            .checked_div(10000)?;
        let effective_input = (amount_in as u128).checked_sub(fee_amount)?;

        // Constant product: dy = (y * dx) / (x + dx)
        let numerator = (output_reserve as u128).checked_mul(effective_input)?;
        let denominator = (input_reserve as u128).checked_add(effective_input)?;
        let amount_out = numerator.checked_div(denominator)?;

        Some((amount_out as u64, fee_amount as u64))
    }
}
