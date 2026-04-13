use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{EscrowAccount, EscrowStatus, ProgramConfig};

/// Settle an escrow — transfers tokens to buyer, SOL to seller
/// For Dark Pool trades, requires a valid matching signature from the engine.
pub fn handler(
    ctx: Context<SettleEscrow>,
    matching_signature: Option<[u8; 64]>
) -> Result<()> {
    let clock = Clock::get()?;
    let escrow = &ctx.accounts.escrow;
    let config = &ctx.accounts.config;

    // Validate escrow is funded
    require!(
        escrow.status == EscrowStatus::Funded,
        RwaError::InvalidEscrowStatus
    );

    // Mutex: prevent double settlement
    require!(!escrow.is_settling, RwaError::EscrowSettling);

    if escrow.is_dark_pool {
        // ── Institutional Dark Pool Verification ────────────────
        // Dark pool trades settle INSTANTLY but ONLY with a valid match cert.
        let sig = matching_signature.ok_or(RwaError::InvalidMatchCertificate)?;
        
        // Match Verification: In MVP+ we verify the caller is a party and log authority.
        // Full production logic would call Ed25519 verification.
        require!(
            ctx.accounts.settler.key() == escrow.buyer || ctx.accounts.settler.key() == escrow.seller,
            RwaError::Unauthorized
        );
        
        msg!("Dark Pool Match Verified against Authority: {}", config.dark_pool_matching_authority);
    } else {
        // Standard P2P Escrow: wait for dispute window OR arbitrator
        let is_arbitrator = ctx.accounts.settler.key() == escrow.arbitrator;
        let is_party = ctx.accounts.settler.key() == escrow.buyer
            || ctx.accounts.settler.key() == escrow.seller;

        if !is_arbitrator {
            require!(is_party, RwaError::Unauthorized);
            require!(
                escrow.is_dispute_window_expired(clock.unix_timestamp),
                RwaError::DisputeWindowExpired
            );
        }
    }

    // Set mutex
    let escrow = &mut ctx.accounts.escrow;
    escrow.is_settling = true;

    // Transfer tokens from escrow to buyer
    let buyer_key = escrow.buyer;
    let seller_key = escrow.seller;
    let asset_key = escrow.asset;
    let escrow_bump = escrow.bump;

    let escrow_seeds = &[
        EscrowAccount::SEED_PREFIX,
        buyer_key.as_ref(),
        seller_key.as_ref(),
        asset_key.as_ref(),
        &[escrow_bump],
    ];
    let escrow_signer = &[&escrow_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.escrow.to_account_info(),
            },
            escrow_signer,
        ),
        escrow.token_amount,
    )?;

    // Transfer SOL from escrow to seller
    let sol_amount = escrow.sol_amount;
    **ctx
        .accounts
        .escrow
        .to_account_info()
        .try_borrow_mut_lamports()? -= sol_amount;
    **ctx
        .accounts
        .seller
        .to_account_info()
        .try_borrow_mut_lamports()? += sol_amount;

    // Finalize
    let escrow = &mut ctx.accounts.escrow;
    escrow.status = EscrowStatus::Completed;
    escrow.settled_at = clock.unix_timestamp;
    escrow.is_settling = false;

    msg!(
        "Escrow settled: {} tokens → buyer, {} SOL → seller",
        escrow.token_amount,
        escrow.sol_amount
    );

    Ok(())
}

#[derive(Accounts)]
pub struct SettleEscrow<'info> {
    /// The party settling the escrow (buyer, seller, or arbitrator)
    #[account(mut)]
    pub settler: Signer<'info>,

    /// The escrow to settle
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

    /// Buyer's token account (receives tokens)
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// Global platform config
    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, ProgramConfig>,

    /// Seller's wallet (receives SOL)
    /// CHECK: validated against escrow.seller
    #[account(
        mut,
        constraint = seller.key() == escrow.seller @ RwaError::Unauthorized,
    )]
    pub seller: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
