use anchor_lang::prelude::*;

/// Asset lifecycle status — tracks a property from submission to sale
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum AssetLifecycleStatus {
    /// Submitted by issuer, awaiting admin review
    Pending,
    /// Under review by verification oracle
    UnderReview,
    /// Legal documents verified, awaiting tokenization
    Verified,
    /// SPL tokens minted, awaiting market activation
    Tokenized,
    /// Live and trading on the platform
    Active,
    /// Temporarily paused (maintenance, compliance hold, governance vote)
    Paused,
    /// Fully sold / delisted — no further trading
    Sold,
}

impl Default for AssetLifecycleStatus {
    fn default() -> Self {
        AssetLifecycleStatus::Pending
    }
}

/// User roles for on-chain RBAC
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum UserRole {
    /// Default — can buy, sell, transfer tokens
    Investor,
    /// Can submit assets for tokenization
    Issuer,
    /// Full platform control
    Admin,
    /// Read-only audit access + compliance oversight
    Auditor,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::Investor
    }
}

/// Governance proposal types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ProposalType {
    /// Vote to sell the underlying property
    SellProperty,
    /// Vote on a renovation or capital expenditure
    Renovation,
    /// Vote to change rent distribution rules or yield BPS
    RentChange,
    /// General-purpose community vote
    GeneralVote,
    /// Emergency pause/unpause
    EmergencyAction,
    /// Vote to deploy idle treasury funds into a yield strategy
    TreasuryReinvestment,
    /// Vote to reset a tripped security circuit breaker (Institutional Recovery)
    OracleReset,
}

/// Governance proposal status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ProposalStatus {
    /// Voting active
    Active,
    /// Quorum met, majority voted in favor
    Passed,
    /// Quorum not met or majority voted against
    Failed,
    /// Passed proposal has been executed
    Executed,
    /// Cancelled by proposer or admin before vote_end
    Cancelled,
}

impl Default for ProposalStatus {
    fn default() -> Self {
        ProposalStatus::Active
    }
}

/// Vote choices
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}

/// Escrow status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum EscrowStatus {
    /// Created, awaiting funding
    Created,
    /// Both sides have deposited funds/tokens
    Funded,
    /// Successfully settled — ownership transferred
    Completed,
    /// Dispute raised, awaiting arbitration
    Disputed,
    /// Refunded to original owners
    Refunded,
}

impl Default for EscrowStatus {
    fn default() -> Self {
        EscrowStatus::Created
    }
}

/// Order types for the on-chain order book
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum OrderType {
    /// Buyer placing a bid
    Bid,
    /// Seller placing an ask
    Ask,
}

/// Order status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum OrderStatus {
    Open,
    PartiallyFilled,
    Filled,
    Cancelled,
    Expired,
}

impl Default for OrderStatus {
    fn default() -> Self {
        OrderStatus::Open
    }
}

/// Oracle source bitmask — tracks which oracles contributed to a price update
/// Bit 0: Pyth, Bit 1: Switchboard, Bit 2: TWAP fallback, Bit 3: Admin override
pub const ORACLE_SOURCE_PYTH: u8 = 1 << 0;
pub const ORACLE_SOURCE_SWITCHBOARD: u8 = 1 << 1;
pub const ORACLE_SOURCE_TWAP: u8 = 1 << 2;
pub const ORACLE_SOURCE_ADMIN: u8 = 1 << 3;

/// AML flag bitmask
pub const AML_FLAG_CLEAR: u8 = 0;
pub const AML_FLAG_PEP: u8 = 1 << 0;
pub const AML_FLAG_SANCTIONS: u8 = 1 << 1;
pub const AML_FLAG_ADVERSE_MEDIA: u8 = 1 << 2;

/// Anti-whale: maximum single AMM swap as basis points of pool reserve
pub const MAX_SWAP_POOL_BPS: u16 = 200; // 2% of pool

/// Maximum oracle price spread before manipulation guard triggers (in BPS)
pub const MAX_ORACLE_SPREAD_BPS: u16 = 500; // 5%

/// Default governance quorum (51%)
pub const DEFAULT_QUORUM_BPS: u16 = 5100;

/// AMM default fee (0.3%)
pub const DEFAULT_AMM_FEE_BPS: u16 = 30;

/// Escrow dispute window (48 hours in seconds)
pub const ESCROW_DISPUTE_WINDOW: i64 = 48 * 60 * 60;

/// Minimum token ownership to create a governance proposal (1% of supply)
pub const MIN_PROPOSAL_OWNERSHIP_BPS: u16 = 100;

/// Governance execution timelock — proposer must wait 24h after vote_end before executing
/// Gives the guardian / admin time to veto malicious proposals
pub const GOVERNANCE_TIMELOCK_SECS: i64 = 24 * 60 * 60; // 24 hours

/// Flash-loan guard: tokens must have been held for at least this many slots before voting
/// At ~400ms/slot, 150 slots ≈ 60 seconds — makes same-TX token acquisition attacks unprofitable
pub const MIN_TOKEN_HOLD_SLOTS: u64 = 150;
