use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{EscrowAccount, EscrowStatus};

/// Refund an escrow — returns SOL to buyer and tokens to seller
/// Called after a dispute is resolved in buyer's favor, or if the escrow is cancelled.
pub fn handler(ctx: Context<RefundEscrow>) -> Result<()> {
    let clock = Clock::get()?;

    // Only refundable states
    require!(
        ctx.accounts.escrow.status == EscrowStatus::Refunded
            || ctx.accounts.escrow.status == EscrowStatus::Created,
        RwaError::InvalidEscrowStatus
    );

    require!(!ctx.accounts.escrow.is_settling, RwaError::EscrowSettling);

    let (buyer_key, seller_key, asset_key, escrow_bump, token_amount, sol_amount) = {
        let escrow = &mut ctx.accounts.escrow;
        escrow.is_settling = true;
        (escrow.buyer, escrow.seller, escrow.asset, escrow.bump, escrow.token_amount, escrow.sol_amount)
    };

    let bump_slice = [escrow_bump];
    let escrow_seeds = &[
        EscrowAccount::SEED_PREFIX,
        buyer_key.as_ref(),
        seller_key.as_ref(),
        asset_key.as_ref(),
        &bump_slice,
    ];
    let escrow_signer = &[&escrow_seeds[..]];

    // Return tokens to seller
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            escrow_signer,
        ),
        token_amount,
    )?;

    // Return SOL to buyer
    **ctx
        .accounts
        .escrow
        .to_account_info()
        .try_borrow_mut_lamports()? -= sol_amount;
    **ctx
        .accounts
        .buyer
        .to_account_info()
        .try_borrow_mut_lamports()? += sol_amount;

    // Finalize
    let escrow = &mut ctx.accounts.escrow;
    escrow.status = EscrowStatus::Refunded;
    escrow.settled_at = clock.unix_timestamp;
    escrow.is_settling = false;

    msg!("Escrow refunded: {} tokens → seller, {} SOL → buyer", token_amount, sol_amount);

    Ok(())
}

#[derive(Accounts)]
pub struct RefundEscrow<'info> {
    /// Caller (arbitrator, buyer, or seller)
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The escrow to refund
    #[account(
        mut,
        seeds = [EscrowAccount::SEED_PREFIX, escrow.buyer.as_ref(), escrow.seller.as_ref(), escrow.asset.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    /// Escrow's token account
    #[account(
        mut,
        token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Seller's token account (receives tokens back)
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// Buyer's wallet (receives SOL back)
    /// CHECK: validated against escrow.buyer
    #[account(
        mut,
        constraint = buyer.key() == escrow.buyer @ RwaError::Unauthorized,
    )]
    pub buyer: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
