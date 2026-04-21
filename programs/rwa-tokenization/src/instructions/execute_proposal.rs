use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{
    AssetAccount, GovernanceProposal, ProgramConfig, ProposalStatus, ProposalType, 
    ReinvestmentWhitelist, GOVERNANCE_TIMELOCK_SECS, TreasuryVault, OracleCircuitBreaker,
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
    let passed = if proposal.proposal_type == ProposalType::TreasuryReinvestment {
        // Institutional Hardening: Treasury moves require supermajority (66%)
        proposal.quorum_met(asset.total_supply) && 
        (proposal.votes_for as u128 * 100 > (proposal.votes_for + proposal.votes_against) as u128 * 66)
    } else {
        proposal.has_passed(asset.total_supply)
    };

    let proposal = &mut ctx.accounts.proposal;

    if passed {
        // Handle Treasury Reinvestment Side-Effects
        if proposal.proposal_type == ProposalType::TreasuryReinvestment {
            let target_account = proposal.target_account.ok_or(RwaError::Unauthorized)?;
            let target_amount = proposal.target_amount.ok_or(RwaError::InvalidAmount)?;

            // Load extra accounts from remaining_accounts
            let treasury_info = ctx.remaining_accounts.get(0).ok_or(RwaError::Unauthorized)?;
            let whitelist_info = ctx.remaining_accounts.get(1).ok_or(RwaError::Unauthorized)?;

            // Verify Whitelist PDA
            let (whitelist_pda, _bump) = Pubkey::find_program_address(
                &[ReinvestmentWhitelist::SEED_PREFIX, target_account.as_ref()],
                ctx.program_id
            );
            require_keys_eq!(whitelist_info.key(), whitelist_pda, RwaError::StrategyNotWhitelisted);
            
            let whitelist_data = Account::<ReinvestmentWhitelist>::try_from(whitelist_info)?;
            require!(whitelist_data.is_active, RwaError::StrategyDisabled);

            // Verify Treasury PDA
            let (treasury_pda, bump) = Pubkey::find_program_address(
                &[TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
                ctx.program_id
            );
            require_keys_eq!(treasury_info.key(), treasury_pda, RwaError::Unauthorized);
            
            let treasury_balance = **treasury_info.try_borrow_lamports()?;
            require!(treasury_balance >= target_amount, RwaError::InsufficientTreasury);

            // Perform PDA-signed transfer
            let asset_key = asset.key();
            let seeds = &[
                TreasuryVault::SEED_PREFIX,
                asset_key.as_ref(),
                &[bump],
            ];
            let signer = &[&seeds[..]];

            anchor_lang::solana_program::program::invoke_signed(
                &anchor_lang::solana_program::system_instruction::transfer(
                    &treasury_pda,
                    &target_account,
                    target_amount,
                ),
                &[
                    treasury_info.to_account_info(),
                    ctx.accounts.executor.to_account_info(), // Just for referencing
                    ctx.accounts.system_program.to_account_info(),
                ],
                signer,
            )?;

            msg!("Treasury Reinvestment of {} lamports to {} EXECUTED", target_amount, target_account);
        }

        // Handle Oracle Circuit Breaker Reset
        if proposal.proposal_type == ProposalType::OracleReset {
            // Load breaker PDA from remaining_accounts
            let breaker_info = ctx.remaining_accounts.get(0).ok_or(RwaError::Unauthorized)?;
            
            // Verify Breaker PDA
            let (breaker_pda, _bump) = Pubkey::find_program_address(
                &[OracleCircuitBreaker::SEED_PREFIX, asset.key().as_ref()],
                ctx.program_id
            );
            require_keys_eq!(breaker_info.key(), breaker_pda, RwaError::Unauthorized);

            // Fetch and modify breaker state
            let mut breaker_data = Account::<OracleCircuitBreaker>::try_from(breaker_info)?;
            breaker_data.reset();
            
            // Serialize back to account
            breaker_data.exit(ctx.program_id)?;

            msg!("Oracle Circuit Breaker for asset {} RESET via Governance Proposal", asset.name);
        }

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


