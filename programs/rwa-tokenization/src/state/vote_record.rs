use anchor_lang::prelude::*;

use crate::state::enums::*;

/// Upgraded VoteRecord with quadratic fields
/// Individual vote record for a governance proposal
/// PDA seeds: [b"vote_record", proposal.key(), voter.key()]
#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub vote: VoteChoice,
    /// Raw token balance at time of voting
    pub raw_token_balance: u64,
    /// Effective quadratic vote power (= isqrt(raw) + delegated_power, capped)
    pub effective_vote_power: u64,
    /// Delegation power added (0 if no delegation)
    pub delegated_power: u64,
    pub voted_at: i64,
    pub bump: u8,
}

impl VoteRecord {
    pub const SEED_PREFIX: &'static [u8] = b"vote_record";
}

/// Delegation record PDA — tracks an active vote delegation
/// PDA seeds: [b"delegation", delegator.key(), asset.key()]
#[account]
#[derive(InitSpace)]
pub struct VoteDelegation {
    pub delegator: Pubkey,
    pub delegate: Pubkey,
    pub asset: Pubkey,
    /// Quadratic power delegated (= isqrt(raw_balance_at_delegation))
    pub delegated_power: u64,
    pub raw_balance_at_delegation: u64,
    pub delegated_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

impl VoteDelegation {
    pub const SEED_PREFIX: &'static [u8] = b"delegation";
}
