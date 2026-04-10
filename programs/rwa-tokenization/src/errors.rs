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
}
