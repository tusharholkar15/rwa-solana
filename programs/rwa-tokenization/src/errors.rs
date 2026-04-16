use anchor_lang::prelude::*;

/// Custom error codes for the RWA Tokenization program
#[error_code]
pub enum RwaError {
    /// 6000 - Asset name exceeds maximum length
    #[msg("Asset name must be 64 characters or less")]
    NameTooLong,

    /// 6001 - Asset symbol exceeds maximum length
    #[msg("Asset symbol must be 10 characters or less")]
    SymbolTooLong,

    /// 6002 - Asset URI exceeds maximum length
    #[msg("Asset URI must be 200 characters or less")]
    UriTooLong,

    /// 6003 - Total supply must be greater than zero
    #[msg("Total supply must be greater than zero")]
    InvalidTotalSupply,

    /// 6004 - Price per token must be greater than zero
    #[msg("Price per token must be greater than zero")]
    InvalidPrice,

    /// 6005 - Not enough tokens available for purchase
    #[msg("Insufficient available supply for this purchase")]
    InsufficientSupply,

    /// 6006 - User does not own enough shares to sell
    #[msg("Insufficient shares owned for this sale")]
    InsufficientShares,

    /// 6007 - User is not whitelisted (KYC not verified)
    #[msg("User is not KYC verified / whitelisted")]
    NotWhitelisted,

    /// 6008 - Asset is not active for trading
    #[msg("Asset is currently not active for trading")]
    AssetNotActive,

    /// 6009 - Arithmetic overflow detected
    #[msg("Arithmetic overflow detected")]
    ArithmeticOverflow,

    /// 6010 - Unauthorized action
    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    /// 6011 - Transfer amount must be greater than zero
    #[msg("Transfer amount must be greater than zero")]
    InvalidAmount,

    /// 6012 - Recipient is not whitelisted
    #[msg("Recipient is not KYC verified / whitelisted")]
    RecipientNotWhitelisted,

    /// 6013 - Oracle price is stale
    #[msg("Oracle price data is too old")]
    StalePriceData,

    /// 6014 - Invalid oracle feed
    #[msg("Invalid oracle price feed")]
    InvalidOracleFeed,

    /// 6015 - Yield distribution amount exceeds treasury balance
    #[msg("Yield amount exceeds treasury balance")]
    InsufficientTreasuryBalance,

    /// 6016 - Annual yield basis points exceeds maximum (10000 = 100%)
    #[msg("Annual yield BPS must be 10000 or less")]
    InvalidYieldBps,

    /// 6017 - User is already whitelisted
    #[msg("User is already whitelisted")]
    AlreadyWhitelisted,

    /// 6018 - Insufficient SOL balance for purchase
    #[msg("Insufficient SOL balance for this purchase")]
    InsufficientFunds,

    // ═══════════════════════════════════════════════════════
    // V2 ERROR CODES — Institutional Upgrade
    // ═══════════════════════════════════════════════════════

    /// 6019 - User's compliance tier is below the asset's minimum requirement
    #[msg("Compliance tier insufficient for this asset")]
    InsufficientTier,

    /// 6020 - User has unresolved AML flags
    #[msg("User is flagged by AML screening")]
    AmlFlagged,

    /// 6021 - User's jurisdiction is not allowed for this asset
    #[msg("Trading not permitted from this jurisdiction")]
    JurisdictionBlocked,

    /// 6022 - Transaction exceeds user's investment limit
    #[msg("Transaction exceeds investment limit")]
    InvestmentLimitExceeded,

    /// 6023 - AMM swap exceeds anti-whale limit (2% of pool)
    #[msg("Swap amount exceeds pool anti-whale limit")]
    SwapExceedsWhaleLimit,

    /// 6024 - Proposal deposit insufficient or user lacks minimum token ownership
    #[msg("Insufficient tokens to create governance proposal")]
    ProposalCreationFailed,

    /// 6025 - Escrow has already been funded
    #[msg("Escrow is already funded")]
    EscrowAlreadyFunded,

    /// 6026 - Dispute window has expired or not yet started
    #[msg("Dispute window expired")]
    DisputeWindowExpired,

    /// 6027 - Platform emergency pause is active
    #[msg("Platform is paused — emergency circuit breaker active")]
    PlatformPaused,

    /// 6028 - Oracle price spread between sources exceeds safety threshold
    #[msg("Oracle price spread exceeds maximum allowed divergence")]
    OracleSpreadExceeded,

    /// 6029 - Liquidity pool is not active
    #[msg("Liquidity pool is not active")]
    PoolNotActive,

    /// 6030 - Insufficient liquidity in pool for this swap
    #[msg("Insufficient pool liquidity")]
    InsufficientLiquidity,

    /// 6031 - Slippage tolerance exceeded
    #[msg("Output amount is below minimum acceptable (slippage exceeded)")]
    SlippageExceeded,

    /// 6032 - Asset lifecycle status doesn't permit this operation
    #[msg("Asset lifecycle status does not permit this operation")]
    InvalidLifecycleStatus,

    /// 6033 - Verifier is not registered or has expired
    #[msg("Verifier is not registered or has expired")]
    InvalidVerifier,

    /// 6034 - Asset fraud score exceeds activation threshold
    #[msg("Fraud score too high to activate asset")]
    FraudScoreTooHigh,

    /// 6035 - Governance voting has ended
    #[msg("Voting period has ended for this proposal")]
    VotingEnded,

    /// 6036 - Governance voting has not started yet
    #[msg("Voting has not started yet")]
    VotingNotStarted,

    /// 6037 - User has already voted on this proposal
    #[msg("User has already voted on this proposal")]
    AlreadyVoted,

    /// 6038 - Proposal has not passed or already executed
    #[msg("Proposal cannot be executed")]
    ProposalNotExecutable,

    /// 6039 - Escrow settlement is currently in progress (mutex)
    #[msg("Escrow settlement already in progress")]
    EscrowSettling,

    /// 6040 - Feature is not enabled on this platform
    #[msg("This feature is not currently enabled")]
    FeatureDisabled,

    /// 6041 - Order is not active (filled, cancelled, or expired)
    #[msg("Order is not active")]
    OrderNotActive,

    /// 6042 - Escrow dispute is not valid at this stage
    #[msg("Cannot dispute escrow in its current status")]
    InvalidEscrowStatus,

    /// 6043 - LP token supply mismatch
    #[msg("LP token supply validation failed")]
    LpSupplyMismatch,

    /// 6044 - Quorum not met for governance proposal
    #[msg("Governance quorum was not reached")]
    QuorumNotMet,

    /// 6045 - Price deviation too high for auto-update
    #[msg("Price deviation exceeds safe threshold — manual review required")]
    PriceDeviationTooHigh,
    /// 6046 - Oracle circuit breaker is tripped
    #[msg("Oracle circuit breaker is tripped. Guardian must reset.")]
    OracleCircuitBreakerTripped,

    /// 6047 - Asset is currently paused
    #[msg("Asset is currently paused")]
    AssetPaused,

    /// 6048 - Governance timelock has not yet elapsed
    #[msg("Governance timelock has not expired — 24h must pass after vote_end")]
    TimelockNotExpired,

    /// 6049 - Vote blocked: tokens acquired too recently (flash-loan guard)
    #[msg("Tokens must be held for at least MIN_TOKEN_HOLD_SLOTS slots before voting")]
    FlashLoanVoteBlocked,

    /// 6050 - Emergency pause active, action blocked
    #[msg("Emergency pause is active — this action is blocked by platform veto")]
    EmergencyPauseActive,

    /// 6051 - Cannot fund yield if there are no circulating shares
    #[msg("No circulating shares available to receive yield")]
    NoHoldersForYield,

    /// 6052 - User has no pending yield to claim
    #[msg("User has no pending yield to claim")]
    NoYieldToClaim,

    /// 6053 - Claim cooldown period is still active
    #[msg("Claim cooldown active — must hold tokens longer before claiming")]
    ClaimCooldownActive,

    /// 6054 - Reinvestment target is not on the admin-approved whitelist
    #[msg("Reinvestment strategy is not on the approved whitelist")]
    StrategyNotWhitelisted,

    /// 6055 - Treasury movement failed: insufficient circulating liquidity
    #[msg("Insufficient treasury balance for reinvestment")]
    InsufficientTreasury,

    /// 6056 - Supermajority (66%) required for treasury capital moves
    #[msg("Treasury reinvestment requires a 66% supermajority quorum")]
    SupermajorityRequired,

    /// 6057 - Reinvestment strategy is currently disabled
    #[msg("Reinvestment strategy is currently disabled")]
    StrategyDisabled,

    /// 6058 - Invalid match certificate for Dark Pool trade
    #[msg("Invalid match certificate signature for Dark Pool trade")]
    InvalidMatchCertificate,

    /// 6059 - Excessive price impact detected on swap
    #[msg("AMM price impact exceeds platform threshold (3%)")]
    ExcessivePriceImpact,

    /// 6060 - Oracle price update slot is too far from current slot (Slot Drift)
    #[msg("Oracle price update slot drift exceeds safety threshold")]
    OracleSlotDriftExceeded,

    /// 6061 - Switchboard aggregator account is invalid or mismatched
    #[msg("Switchboard aggregator account is invalid or mismatched")]
    InvalidSwitchboardFeed,
}
