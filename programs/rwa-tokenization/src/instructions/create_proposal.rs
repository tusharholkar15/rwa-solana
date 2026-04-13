use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::RwaError;
use crate::state::{
    AssetAccount, GovernanceProposal, ProposalStatus, ProposalType, UserOwnership,
    WhitelistEntry, MIN_PROPOSAL_OWNERSHIP_BPS, DEFAULT_QUORUM_BPS,
};

/// Create a governance proposal for a property
/// Requires minimum token ownership (1% of supply) and a SOL deposit.
pub fn handler(
    ctx: Context<CreateProposal>,
    proposal_type: ProposalType,
    title: String,
    description_hash: [u8; 32],
    voting_period_seconds: i64,
    quorum_bps: u16,
    target_account: Option<Pubkey>,
    target_amount: Option<u64>,
) -> Result<()> {
    let clock = Clock::get()?;
    let asset = &ctx.accounts.asset;
    let ownership = &ctx.accounts.user_ownership;

    // Validate ownership threshold (1% of total supply)
    let min_tokens = asset
        .total_supply
        .checked_mul(MIN_PROPOSAL_OWNERSHIP_BPS as u64)
        .ok_or(RwaError::ArithmeticOverflow)?
        / 10000;
    require!(
        ownership.shares_owned >= min_tokens,
        RwaError::ProposalCreationFailed
    );

    // Validate whitelist
    let whitelist = &ctx.accounts.proposer_whitelist;
    require!(
        whitelist.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
    );

    // Validate title length
    require!(title.len() <= 64, RwaError::NameTooLong);

    // Determine voting period (min 1 day, max 30 days, default 7 days)
    let vote_duration = if voting_period_seconds > 0 {
        voting_period_seconds
            .max(24 * 60 * 60)          // Min 1 day
            .min(30 * 24 * 60 * 60)     // Max 30 days
    } else {
        GovernanceProposal::DEFAULT_VOTING_PERIOD
    };

    // Determine quorum (min 10%, default 51%)
    let actual_quorum = if quorum_bps > 0 {
        quorum_bps.max(1000).min(10000) // 10% to 100%
    } else {
        DEFAULT_QUORUM_BPS
    };

    // Collect proposal stake deposit
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.proposer.to_account_info(),
                to: ctx.accounts.proposal.to_account_info(),
            },
        ),
        GovernanceProposal::PROPOSAL_STAKE,
    )?;

    // Initialize proposal
    let proposal = &mut ctx.accounts.proposal;
    proposal.asset = asset.key();
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.proposal_type = proposal_type;
    proposal.title = title;
    proposal.description_hash = description_hash;
    proposal.proposal_id = clock.unix_timestamp as u64; // Use timestamp as unique ID
    proposal.vote_start = clock.unix_timestamp;
    proposal.vote_end = clock.unix_timestamp + vote_duration;
    proposal.quorum_bps = actual_quorum;
    proposal.votes_for = 0;
    proposal.votes_against = 0;
    proposal.votes_abstain = 0;
    proposal.status = ProposalStatus::Active;
    proposal.target_account = target_account;
    proposal.target_amount = target_amount;
    proposal.execution_hash = [0u8; 32];
    proposal.executed_at = 0;
    proposal.stake_amount = GovernanceProposal::PROPOSAL_STAKE;
    proposal.voter_count = 0;
    proposal.bump = ctx.bumps.proposal;

    msg!(
        "Proposal created for '{}': '{}' (type={:?}, quorum={}bps, voting_ends={})",
        asset.name,
        proposal.title,
        proposal_type,
        actual_quorum,
        proposal.vote_end
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    /// The proposer
    #[account(mut)]
    pub proposer: Signer<'info>,

    /// The asset the proposal is about
    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Proposer's ownership record (verifies minimum token holding)
    #[account(
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), proposer.key().as_ref()],
        bump = user_ownership.bump,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    /// Proposer's whitelist entry
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, proposer.key().as_ref()],
        bump = proposer_whitelist.bump,
    )]
    pub proposer_whitelist: Account<'info, WhitelistEntry>,

    /// The governance proposal PDA
    #[account(
        init,
        payer = proposer,
        space = 8 + GovernanceProposal::INIT_SPACE,
        seeds = [
            GovernanceProposal::SEED_PREFIX,
            asset.key().as_ref(),
            &Clock::get().unwrap().unix_timestamp.to_le_bytes(),
        ],
        bump,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    pub system_program: Program<'info, System>,
}
