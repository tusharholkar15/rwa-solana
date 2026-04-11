use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{EscrowAccount, EscrowStatus};

/// Raise a dispute on a funded escrow within the dispute window.
/// Freezes the escrow for arbitrator review.
pub fn handler(ctx: Context<DisputeEscrow>, reason: String) -> Result<()> {
    let clock = Clock::get()?;
    let escrow = &ctx.accounts.escrow;

    // Only funded escrows can be disputed
    require!(
        escrow.status == EscrowStatus::Funded,
        RwaError::InvalidEscrowStatus
    );

    // Must be within dispute window
    require!(
        !escrow.is_dispute_window_expired(clock.unix_timestamp),
        RwaError::DisputeWindowExpired
    );

    // Only buyer or seller can dispute
    let caller = ctx.accounts.disputer.key();
    require!(
        caller == escrow.buyer || caller == escrow.seller,
        RwaError::Unauthorized
    );

    // Raise dispute
    let escrow = &mut ctx.accounts.escrow;
    escrow.status = EscrowStatus::Disputed;
    escrow.dispute_reason = reason.chars().take(128).collect();

    msg!(
        "Dispute raised on escrow by {}: {}",
        ctx.accounts.disputer.key(),
        escrow.dispute_reason
    );

    Ok(())
}

/// Resolve a dispute — arbitrator decides who gets the funds.
/// favor_buyer = true → refund buyer; false → release to seller.
pub fn resolve_handler(ctx: Context<ResolveDispute>, favor_buyer: bool) -> Result<()> {
    let clock = Clock::get()?;
    let escrow = &ctx.accounts.escrow;

    // Must be disputed
    require!(
        escrow.status == EscrowStatus::Disputed,
        RwaError::InvalidEscrowStatus
    );

    // Only arbitrator can resolve
    require!(
        ctx.accounts.arbitrator.key() == escrow.arbitrator,
        RwaError::Unauthorized
    );

    let escrow = &mut ctx.accounts.escrow;

    if favor_buyer {
        // Refund SOL to buyer, tokens back to seller
        escrow.status = EscrowStatus::Refunded;
    } else {
        // Complete trade — tokens to buyer, SOL to seller
        escrow.status = EscrowStatus::Completed;
    }

    escrow.settled_at = clock.unix_timestamp;

    msg!(
        "Dispute resolved — favor_buyer={}, status={:?}",
        favor_buyer,
        escrow.status
    );

    // NOTE: Actual token/SOL transfers must be done via settle_escrow or refund_escrow
    // after this status change. This instruction only changes the status.

    Ok(())
}

#[derive(Accounts)]
pub struct DisputeEscrow<'info> {
    /// The party raising the dispute
    pub disputer: Signer<'info>,

    /// The escrow to dispute
    #[account(
        mut,
        seeds = [EscrowAccount::SEED_PREFIX, escrow.buyer.as_ref(), escrow.seller.as_ref(), escrow.asset.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    /// The arbitrator resolving the dispute
    pub arbitrator: Signer<'info>,

    /// The escrow with the dispute
    #[account(
        mut,
        seeds = [EscrowAccount::SEED_PREFIX, escrow.buyer.as_ref(), escrow.seller.as_ref(), escrow.asset.as_ref()],
        bump = escrow.bump,
        constraint = escrow.arbitrator == arbitrator.key() @ RwaError::Unauthorized,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    pub system_program: Program<'info, System>,
}
