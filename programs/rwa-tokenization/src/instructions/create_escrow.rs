use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, EscrowAccount, EscrowStatus, WhitelistEntry, ESCROW_DISPUTE_WINDOW};

/// Create an escrow for a P2P trade
/// Buyer locks SOL, seller locks tokens. Both held until settlement or dispute.
pub fn handler(
    ctx: Context<CreateEscrow>,
    token_amount: u64,
    sol_amount: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    require!(token_amount > 0, RwaError::InvalidAmount);
    require!(sol_amount > 0, RwaError::InvalidAmount);

    // Validate both parties are whitelisted
    require!(
        ctx.accounts.buyer_whitelist.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
    );
    require!(
        ctx.accounts.seller_whitelist.is_valid(clock.unix_timestamp),
        RwaError::RecipientNotWhitelisted
    );

    // Transfer SOL from buyer to escrow PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        ),
        sol_amount,
    )?;

    // Transfer tokens from seller to escrow token account
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.seller_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Initialize escrow
    let escrow = &mut ctx.accounts.escrow;
    escrow.buyer = ctx.accounts.buyer.key();
    escrow.seller = ctx.accounts.seller.key();
    escrow.asset = ctx.accounts.asset.key();
    escrow.token_amount = token_amount;
    escrow.sol_amount = sol_amount;
    escrow.dispute_deadline = clock.unix_timestamp + ESCROW_DISPUTE_WINDOW;
    escrow.status = EscrowStatus::Funded;
    escrow.arbitrator = ctx.accounts.asset.authority; // Asset authority is default arbitrator
    escrow.created_at = clock.unix_timestamp;
    escrow.settled_at = 0;
    escrow.dispute_reason = String::new();
    escrow.is_settling = false;
    escrow.bump = ctx.bumps.escrow;

    msg!(
        "Escrow created: {} tokens + {} SOL, dispute deadline: {}",
        token_amount,
        sol_amount,
        escrow.dispute_deadline
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CreateEscrow<'info> {
    /// The buyer (locks SOL)
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// The seller (locks tokens) — must also sign
    #[account(mut)]
    pub seller: Signer<'info>,

    /// The asset being traded
    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Escrow PDA
    #[account(
        init,
        payer = buyer,
        space = 8 + EscrowAccount::INIT_SPACE,
        seeds = [EscrowAccount::SEED_PREFIX, buyer.key().as_ref(), seller.key().as_ref(), asset.key().as_ref()],
        bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,

    /// Seller's token account
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// Escrow's token account to hold tokens during escrow
    #[account(
        init,
        payer = buyer,
        token::mint = asset.mint,
        token::authority = escrow,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// Buyer's whitelist
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, buyer.key().as_ref()],
        bump = buyer_whitelist.bump,
    )]
    pub buyer_whitelist: Account<'info, WhitelistEntry>,

    /// Seller's whitelist
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, seller.key().as_ref()],
        bump = seller_whitelist.bump,
    )]
    pub seller_whitelist: Account<'info, WhitelistEntry>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
