use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("RWATokenXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod rwa_tokenization {
    use super::*;

    // ═══════════════════════════════════════════════════════
    // CORE — Asset Management
    // ═══════════════════════════════════════════════════════

    /// Initialize a new tokenized real-world asset
    /// Creates the asset account, SPL token mint, and treasury vault
    pub fn initialize_asset(
        ctx: Context<InitializeAsset>,
        name: String,
        symbol: String,
        uri: String,
        total_supply: u64,
        price_per_token: u64,
        annual_yield_bps: u16,
    ) -> Result<()> {
        instructions::initialize_asset::handler(
            ctx,
            name,
            symbol,
            uri,
            total_supply,
            price_per_token,
            annual_yield_bps,
        )
    }

    /// Whitelist a KYC-verified user for trading
    pub fn whitelist_user(ctx: Context<WhitelistUser>) -> Result<()> {
        instructions::whitelist_user::handler(ctx)
    }

    /// Remove a user from the whitelist
    pub fn remove_whitelist(ctx: Context<RemoveWhitelist>) -> Result<()> {
        instructions::whitelist_user::remove_handler(ctx)
    }

    /// Buy fractional shares of a tokenized asset
    pub fn buy_shares(ctx: Context<BuyShares>, amount: u64) -> Result<()> {
        instructions::buy_shares::handler(ctx, amount)
    }

    /// Sell fractional shares back to the treasury
    pub fn sell_shares(ctx: Context<SellShares>, amount: u64) -> Result<()> {
        instructions::sell_shares::handler(ctx, amount)
    }

    /// Transfer shares between whitelisted users
    pub fn transfer_shares(ctx: Context<TransferShares>, amount: u64) -> Result<()> {
        instructions::transfer_shares::handler(ctx, amount)
    }

    /// Distribute yield to all token holders of an asset
    pub fn distribute_yield(ctx: Context<DistributeYield>, amount: u64) -> Result<()> {
        instructions::distribute_yield::handler(ctx, amount)
    }

    /// Distribute USDC yield from RentVault
    pub fn distribute_usdc_yield(ctx: Context<DistributeUsdcYield>, holder_amount: u64) -> Result<()> {
        instructions::collect_rent::distribute_handler(ctx, holder_amount)
    }

    /// Collect rent in USDC
    pub fn collect_rent(ctx: Context<CollectRent>, amount: u64, memo: [u8; 32]) -> Result<()> {
        instructions::collect_rent::handler(ctx, amount, memo)
    }

    /// Update asset price from oracle feeds
    pub fn update_price(ctx: Context<UpdatePrice>, switchboard_price: u64, twap_price: u64) -> Result<()> {
        instructions::update_price::handler(ctx, switchboard_price, twap_price)
    }

    /// Reset the oracle circuit breaker
    pub fn reset_circuit_breaker(ctx: Context<ResetCircuitBreaker>) -> Result<()> {
        instructions::update_price::reset_circuit_breaker_handler(ctx)
    }

    // ═══════════════════════════════════════════════════════
    // MODULE 1 — Asset Verification
    // ═══════════════════════════════════════════════════════

    /// Verify an asset's legal documents and assign fraud score
    pub fn verify_asset(
        ctx: Context<VerifyAsset>,
        doc_hash: [u8; 32],
        fraud_score: u8,
        legal_doc_count: u8,
    ) -> Result<()> {
        instructions::verify_asset::handler(ctx, doc_hash, fraud_score, legal_doc_count)
    }

    /// Approve a verified asset for tokenization and mint SPL tokens
    pub fn approve_tokenization(ctx: Context<ApproveTokenization>) -> Result<()> {
        instructions::approve_tokenization::handler(ctx)
    }

    /// Migrate a v1 asset to v2 format with institutional fields
    pub fn migrate_asset_v2(ctx: Context<MigrateAssetV2>) -> Result<()> {
        instructions::migrate_asset_v2::handler(ctx)
    }

    // ═══════════════════════════════════════════════════════
    // MODULE 2 — Compliance & RBAC
    // ═══════════════════════════════════════════════════════

    /// Set a user's role, compliance tier, jurisdiction, and AML flags
    pub fn set_role(
        ctx: Context<SetRole>,
        role: UserRole,
        compliance_tier: u8,
        jurisdiction: u16,
        aml_flags: u8,
        investment_limit: u64,
    ) -> Result<()> {
        instructions::set_role::handler(ctx, role, compliance_tier, jurisdiction, aml_flags, investment_limit)
    }

    // ═══════════════════════════════════════════════════════
    // MODULE 3 — AMM Liquidity Pool
    // ═══════════════════════════════════════════════════════

    /// Create a liquidity pool for an asset
    pub fn create_pool(
        ctx: Context<CreatePool>,
        initial_tokens: u64,
        initial_sol: u64,
        fee_bps: u16,
    ) -> Result<()> {
        instructions::create_pool::handler(ctx, initial_tokens, initial_sol, fee_bps)
    }

    /// Execute an AMM swap (token ↔ SOL)
    pub fn swap_tokens(
        ctx: Context<SwapTokens>,
        amount_in: u64,
        min_amount_out: u64,
        is_token_to_sol: bool,
    ) -> Result<()> {
        instructions::swap_tokens::handler(ctx, amount_in, min_amount_out, is_token_to_sol)
    }

    // ═══════════════════════════════════════════════════════
    // MODULE 4 — Escrow & Settlement
    // ═══════════════════════════════════════════════════════

    /// Create an escrow for a P2P trade
    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        token_amount: u64,
        sol_amount: u64,
    ) -> Result<()> {
        instructions::create_escrow::handler(ctx, token_amount, sol_amount)
    }

    /// Settle an escrow after the dispute window
    pub fn settle_escrow(ctx: Context<SettleEscrow>) -> Result<()> {
        instructions::settle_escrow::handler(ctx)
    }

    /// Raise a dispute on a funded escrow
    pub fn dispute_escrow(ctx: Context<DisputeEscrow>, reason: String) -> Result<()> {
        instructions::dispute_escrow::handler(ctx, reason)
    }

    /// Resolve a dispute (arbitrator only)
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, favor_buyer: bool) -> Result<()> {
        instructions::dispute_escrow::resolve_handler(ctx, favor_buyer)
    }

    /// Refund an escrow (returns assets to original owners)
    pub fn refund_escrow(ctx: Context<RefundEscrow>) -> Result<()> {
        instructions::refund_escrow::handler(ctx)
    }

    // ═══════════════════════════════════════════════════════
    // MODULE 6 — DAO Governance
    // ═══════════════════════════════════════════════════════

    /// Create a governance proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_type: ProposalType,
        title: String,
        description_hash: [u8; 32],
        voting_period_seconds: i64,
        quorum_bps: u16,
    ) -> Result<()> {
        instructions::create_proposal::handler(
            ctx, proposal_type, title, description_hash, voting_period_seconds, quorum_bps,
        )
    }

    /// Cast a vote on a governance proposal
    pub fn cast_vote(ctx: Context<CastVote>, vote: VoteChoice) -> Result<()> {
        instructions::cast_vote::handler(ctx, vote)
    }

    /// Delegate governance voting power
    pub fn delegate_vote(ctx: Context<DelegateVote>) -> Result<()> {
        instructions::cast_vote::delegate_handler(ctx)
    }

    /// Execute a governance proposal (finalize voting + return stake)
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::execute_proposal::handler(ctx)
    }

    // ═══════════════════════════════════════════════════════
    // MODULE 10 — Platform Configuration
    // ═══════════════════════════════════════════════════════

    /// Initialize global platform configuration
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        protocol_fee_bps: u16,
        max_oracle_staleness: u64,
    ) -> Result<()> {
        instructions::initialize_config::handler(ctx, protocol_fee_bps, max_oracle_staleness)
    }

    /// Update global platform configuration
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        emergency_pause: Option<bool>,
        protocol_fee_bps: Option<u16>,
        max_oracle_staleness: Option<u64>,
        governance_enabled: Option<bool>,
        amm_enabled: Option<bool>,
        escrow_enabled: Option<bool>,
    ) -> Result<()> {
        instructions::initialize_config::update_handler(
            ctx, emergency_pause, protocol_fee_bps, max_oracle_staleness,
            governance_enabled, amm_enabled, escrow_enabled,
        )
    }
}
