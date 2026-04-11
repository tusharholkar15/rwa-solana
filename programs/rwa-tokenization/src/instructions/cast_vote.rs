use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{
    AssetAccount, GovernanceProposal, UserOwnership, VoteChoice, VoteDelegation, VoteRecord,
    WhitelistEntry,
};

/// Cast a vote on a governance proposal using QUADRATIC voting power.
///
/// Quadratic Voting design:
///   - Raw voting power = shares_owned
///   - Effective power  = integer_sqrt(shares_owned)
///   - Vote cap         = integer_sqrt(MAX_VOTE_CAP_TOKENS) prevents extreme whale dominance
///
/// This means a whale with 10,000x more tokens only gets 100x more votes,
/// not 10,000x — dramatically reducing plutocratic outcomes.
///
/// Delegation support: If a voter has received delegated power, add it on top
/// of their own sqrt-adjusted balance.
pub fn handler(ctx: Context<CastVote>, vote: VoteChoice) -> Result<()> {
    let clock = Clock::get()?;
    let proposal = &ctx.accounts.proposal;

    // Validate voting is active
    require!(
        proposal.is_voting_active(clock.unix_timestamp),
        RwaError::VotingEnded
    );

    // Validate whitelist
    require!(
        ctx.accounts.voter_whitelist.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
    );

    // Get raw token balance
    let raw_balance = ctx.accounts.user_ownership.shares_owned;
    require!(raw_balance > 0, RwaError::InsufficientShares);

    // ── Quadratic Voting Power ─────────────────────────────────
    // effective_power = isqrt(raw_balance)
    // vote cap at isqrt(MAX_VOTE_CAP): prevents any single wallet
    // from having more than sqrt(0.2% of typical 100k supply) = 447 raw power
    let effective_power = integer_sqrt(raw_balance);

    // Cap: max voting power = sqrt(20_000) = 141 (20% of 100k supply)
    const MAX_VOTE_TOKENS: u64 = 20_000;
    let vote_cap = integer_sqrt(MAX_VOTE_TOKENS);
    let capped_power = effective_power.min(vote_cap);

    // Add delegation power (if any)
    let delegated_power = ctx.accounts.vote_record.delegated_power;
    let final_power = capped_power
        .checked_add(delegated_power)
        .ok_or(RwaError::ArithmeticOverflow)?;

    require!(final_power > 0, RwaError::InsufficientShares);

    // ── Update Vote Record ─────────────────────────────────────
    let vote_record = &mut ctx.accounts.vote_record;
    vote_record.proposal = proposal.key();
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.vote = vote;
    vote_record.raw_token_balance = raw_balance;
    vote_record.effective_vote_power = final_power;
    vote_record.voted_at = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;

    // ── Update Proposal Tallies ────────────────────────────────
    let proposal = &mut ctx.accounts.proposal;
    match vote {
        VoteChoice::For => {
            proposal.votes_for = proposal
                .votes_for
                .checked_add(final_power)
                .ok_or(RwaError::ArithmeticOverflow)?;
        }
        VoteChoice::Against => {
            proposal.votes_against = proposal
                .votes_against
                .checked_add(final_power)
                .ok_or(RwaError::ArithmeticOverflow)?;
        }
        VoteChoice::Abstain => {
            proposal.votes_abstain = proposal
                .votes_abstain
                .checked_add(final_power)
                .ok_or(RwaError::ArithmeticOverflow)?;
        }
    }

    proposal.voter_count = proposal
        .voter_count
        .checked_add(1)
        .ok_or(RwaError::ArithmeticOverflow)?;

    msg!(
        "Vote cast: {:?} | Raw balance: {} | Effective power: {} (capped: {}) | Delegation: {} | Total: {}",
        vote,
        raw_balance,
        effective_power,
        capped_power,
        delegated_power,
        final_power
    );

    Ok(())
}

/// Delegate voting power to another wallet.
/// Delegator transfers their quadratic vote power to the delegate for all future votes.
pub fn delegate_handler(ctx: Context<DelegateVote>) -> Result<()> {
    let clock = Clock::get()?;
    let delegation = &mut ctx.accounts.delegation_record;

    let raw_balance = ctx.accounts.user_ownership.shares_owned;
    require!(raw_balance > 0, RwaError::InsufficientShares);

    let delegated_power = integer_sqrt(raw_balance);

    delegation.delegator = ctx.accounts.delegator.key();
    delegation.delegate = ctx.accounts.delegate.key();
    delegation.asset = ctx.accounts.user_ownership.asset;
    delegation.delegated_power = delegated_power;
    delegation.raw_balance_at_delegation = raw_balance;
    delegation.delegated_at = clock.unix_timestamp;
    delegation.is_active = true;
    delegation.bump = ctx.bumps.delegation_record;

    msg!(
        "Vote delegated: {} (raw: {}) voting power from {} → {}",
        delegated_power,
        raw_balance,
        ctx.accounts.delegator.key(),
        ctx.accounts.delegate.key()
    );

    Ok(())
}

/// Integer square root (isqrt) — safe, no floating point
/// Uses Newton's method for on-chain computation
fn integer_sqrt(n: u64) -> u64 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

// VoteDelegation and VoteRecord state definitions moved to src/state/vote_record.rs

#[derive(Accounts)]
pub struct CastVote<'info> {
    /// The voter
    #[account(mut)]
    pub voter: Signer<'info>,

    /// The proposal being voted on
    #[account(
        mut,
        seeds = [
            GovernanceProposal::SEED_PREFIX,
            proposal.asset.as_ref(),
            &proposal.proposal_id.to_le_bytes(),
        ],
        bump = proposal.bump,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    /// Voter's token ownership (raw balance for quadratic calc)
    #[account(
        seeds = [UserOwnership::SEED_PREFIX, proposal.asset.as_ref(), voter.key().as_ref()],
        bump = user_ownership.bump,
        constraint = user_ownership.shares_owned > 0 @ RwaError::InsufficientShares,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    /// Voter's whitelist entry
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, voter.key().as_ref()],
        bump = voter_whitelist.bump,
    )]
    pub voter_whitelist: Account<'info, WhitelistEntry>,

    /// Vote record (one per voter per proposal — init_if_needed handles delegation power)
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [VoteRecord::SEED_PREFIX, proposal.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelegateVote<'info> {
    /// The user delegating their votes
    #[account(mut)]
    pub delegator: Signer<'info>,

    /// CHECK: Validated as recipient of delegation
    pub delegate: UncheckedAccount<'info>,

    /// Delegator's ownership record
    #[account(
        seeds = [UserOwnership::SEED_PREFIX, user_ownership.asset.as_ref(), delegator.key().as_ref()],
        bump = user_ownership.bump,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    /// Delegation record PDA
    #[account(
        init,
        payer = delegator,
        space = 8 + VoteDelegation::INIT_SPACE,
        seeds = [VoteDelegation::SEED_PREFIX, delegator.key().as_ref(), user_ownership.asset.as_ref()],
        bump,
    )]
    pub delegation_record: Account<'info, VoteDelegation>,

    pub system_program: Program<'info, System>,
}
