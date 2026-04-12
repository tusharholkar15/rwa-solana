use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{
    AssetAccount, GovernanceProposal, ProgramConfig, ProposalStatus, GOVERNANCE_TIMELOCK_SECS,
};

/// Execute a passed governance proposal.
///
/// HARDENING: Two additional checks are now enforced:
///
/// 1. **Timelock**: A minimum of `GOVERNANCE_TIMELOCK_SECS` (24h) must have elapsed since
///    `vote_end` before the proposal can be executed. This gives the platform guardian time
///    to veto any malicious proposal that slipped through quorum.
///
/// 2. **Emergency Veto**: If `ProgramConfig.emergency_pause = true`, all proposal execution
///    is halted until the pause is lifted by the platform authority.
///
/// 3. **Status Precision**: Passed proposals transition to `Executed` (not `Passed`),
///    preventing idempotency bugs from double-execution.
pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let clock = Clock::get()?;
    let proposal = &ctx.accounts.proposal;
    let asset = &ctx.accounts.asset;
    let config = &ctx.accounts.config;

    // ── Emergency Veto ─────────────────────────────────────────
    require!(
        !config.emergency_pause,
        RwaError::EmergencyPauseActive
    );

    // ── Voting Must Have Ended ──────────────────────────────────
    require!(
        proposal.is_voting_ended(clock.unix_timestamp),
        RwaError::VotingNotStarted
    );

    // ── Timelock Guard ──────────────────────────────────────────
    // Must wait 24h after vote_end before executing (guardian veto window)
    require!(
        clock.unix_timestamp >= proposal.vote_end + GOVERNANCE_TIMELOCK_SECS,
        RwaError::TimelockNotExpired
    );

    // ── Proposal Must Be Active (not executed or cancelled) ─────
    require!(
        proposal.status == ProposalStatus::Active,
        RwaError::ProposalNotExecutable
    );

    // ── Check Outcome ───────────────────────────────────────────
    let passed = proposal.has_passed(asset.total_supply);
    let proposal = &mut ctx.accounts.proposal;

    if passed {
        proposal.status = ProposalStatus::Executed;
        proposal.executed_at = clock.unix_timestamp;

        msg!(
            "Proposal '{}' EXECUTED (timelock cleared) — {} for / {} against / {} abstain",
            proposal.title,
            proposal.votes_for,
            proposal.votes_against,
            proposal.votes_abstain,
        );
    } else {
        proposal.status = ProposalStatus::Failed;

        msg!(
            "Proposal '{}' FAILED — {} for / {} against (quorum_met: {})",
            proposal.title,
            proposal.votes_for,
            proposal.votes_against,
            proposal.quorum_met(asset.total_supply)
        );
    }

    // ── Return Proposer's Stake ─────────────────────────────────
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
    /// Any executor is allowed — the timelock + veto are the guards, not identity
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

    /// Global platform config — checked for emergency_pause veto
    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}


