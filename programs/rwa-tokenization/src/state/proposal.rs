use anchor_lang::prelude::*;

use crate::state::enums::*;

/// Governance proposal for property-level decisions
/// PDA seeds: [b"proposal", asset.key(), proposal_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct GovernanceProposal {
    /// The asset this proposal pertains to
    pub asset: Pubkey,

    /// The user who created the proposal
    pub proposer: Pubkey,

    /// Type of proposal
    pub proposal_type: ProposalType,

    /// Short title (max 64 bytes)
    #[max_len(64)]
    pub title: String,

    /// SHA-256 hash of the full proposal description stored on IPFS
    pub description_hash: [u8; 32],

    /// Unique proposal ID (auto-incremented per asset)
    pub proposal_id: u64,

    /// Unix timestamp when voting starts
    pub vote_start: i64,

    /// Unix timestamp when voting ends (typically 7 days after start)
    pub vote_end: i64,

    /// Quorum requirement in basis points of total supply
    /// e.g., 5100 = 51% of all tokens must have voted
    pub quorum_bps: u16,

    /// Total token-weighted votes in favor
    pub votes_for: u64,

    /// Total token-weighted votes against
    pub votes_against: u64,

    /// Total token-weighted abstentions
    pub votes_abstain: u64,

    /// Current proposal status
    pub status: ProposalStatus,

    /// Optional target account for treasury moves or parameter changes
    pub target_account: Option<Pubkey>,

    /// Optional target amount for treasury moves
    pub target_amount: Option<u64>,

    /// SHA-256 hash of the on-chain action to execute if passed
    pub execution_hash: [u8; 32],

    /// Unix timestamp when the proposal was executed (0 = not yet)
    pub executed_at: i64,

    /// SOL deposit staked by proposer (returned after execution/failure)
    pub stake_amount: u64,

    /// Total number of unique voters
    pub voter_count: u32,

    /// PDA bump seed
    pub bump: u8,
}

impl GovernanceProposal {
    pub const SEED_PREFIX: &'static [u8] = b"proposal";

    /// Minimum SOL deposit to create a proposal (0.1 SOL)
    pub const PROPOSAL_STAKE: u64 = 100_000_000; // 0.1 SOL in lamports

    /// Default voting period (7 days in seconds)
    pub const DEFAULT_VOTING_PERIOD: i64 = 7 * 24 * 60 * 60;

    /// Check if voting is currently active
    pub fn is_voting_active(&self, current_timestamp: i64) -> bool {
        self.status == ProposalStatus::Active
            && current_timestamp >= self.vote_start
            && current_timestamp < self.vote_end
    }

    /// Check if voting period has ended
    pub fn is_voting_ended(&self, current_timestamp: i64) -> bool {
        current_timestamp >= self.vote_end
    }

    /// Total votes cast (for + against + abstain)
    pub fn total_votes(&self) -> u64 {
        self.votes_for
            .saturating_add(self.votes_against)
            .saturating_add(self.votes_abstain)
    }

    /// Check if quorum is met (based on total supply)
    pub fn quorum_met(&self, total_supply: u64) -> bool {
        if total_supply == 0 {
            return false;
        }
        let quorum_threshold = (total_supply as u128)
            .checked_mul(self.quorum_bps as u128)
            .unwrap_or(0)
            / 10000;
        self.total_votes() as u128 >= quorum_threshold
    }

    /// Check if the proposal passed (quorum met AND more for than against)
    pub fn has_passed(&self, total_supply: u64) -> bool {
        self.quorum_met(total_supply) && self.votes_for > self.votes_against
    }
}
