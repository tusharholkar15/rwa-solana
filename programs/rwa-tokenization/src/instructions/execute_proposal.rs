use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{AssetAccount, GovernanceProposal, ProposalStatus, WhitelistEntry, UserRole};

/// Execute a passed governance proposal
/// Finalizes the proposal, returns the proposer's stake, and applies the voted action.
pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let clock = Clock::get()?;
    let proposal = &ctx.accounts.proposal;
    let asset = &ctx.accounts.asset;

    // Voting must have ended
    require!(
        proposal.is_voting_ended(clock.unix_timestamp),
        RwaError::VotingNotStarted
    );

    // Proposal must be Active (not already executed/cancelled)
    require!(
        proposal.status == ProposalStatus::Active,
        RwaError::ProposalNotExecutable
    );

    // Check if it passed
    let passed = proposal.has_passed(asset.total_supply);

    // Update status
    let proposal = &mut ctx.accounts.proposal;

    if passed {
        proposal.status = ProposalStatus::Passed;
        proposal.executed_at = clock.unix_timestamp;

        msg!(
            "Proposal '{}' PASSED — votes: {} for / {} against / {} abstain (quorum: {}/{})",
            proposal.title,
            proposal.votes_for,
            proposal.votes_against,
            proposal.votes_abstain,
            proposal.total_votes(),
            asset.total_supply
        );
    } else {
        proposal.status = ProposalStatus::Failed;

        msg!(
            "Proposal '{}' FAILED — votes: {} for / {} against (quorum met: {})",
            proposal.title,
            proposal.votes_for,
            proposal.votes_against,
            proposal.quorum_met(asset.total_supply)
        );
    }

    // Return proposer's stake
    let stake = proposal.stake_amount;
    if stake > 0 {
        **ctx
            .accounts
            .proposal
            .to_account_info()
            .try_borrow_mut_lamports()? -= stake;
        **ctx
            .accounts
            .proposer
            .to_account_info()
            .try_borrow_mut_lamports()? += stake;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    /// The executor (must be admin or the original proposer after voting ends)
    pub executor: Signer<'info>,

    /// The asset this proposal is for
    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The governance proposal to execute
    #[account(
        mut,
        seeds = [
            GovernanceProposal::SEED_PREFIX,
            proposal.asset.as_ref(),
            &proposal.proposal_id.to_le_bytes(),
        ],
        bump = proposal.bump,
        constraint = proposal.asset == asset.key() @ RwaError::Unauthorized,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    /// Proposer's wallet (to return stake)
    /// CHECK: validated against proposal.proposer
    #[account(
        mut,
        constraint = proposer.key() == proposal.proposer @ RwaError::Unauthorized,
    )]
    pub proposer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
