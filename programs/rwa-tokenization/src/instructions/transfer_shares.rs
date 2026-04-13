use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, UserOwnership, WhitelistEntry};

/// Transfer shares between two whitelisted users (P2P)
pub fn handler(ctx: Context<TransferShares>, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);

    let clock = Clock::get()?;
    let asset = &ctx.accounts.asset;

    // Validate asset is active
    require!(asset.is_active, RwaError::AssetNotActive);

    // Validate sender whitelist
    let sender_wl = &ctx.accounts.sender_whitelist;
    require!(
        sender_wl.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
    );

    // Validate recipient whitelist
    let recipient_wl = &ctx.accounts.recipient_whitelist;
    require!(
        recipient_wl.is_valid(clock.unix_timestamp),
        RwaError::RecipientNotWhitelisted
    );

    // Validate sender owns enough shares
    let sender_ownership = &ctx.accounts.sender_ownership;
    require!(
        sender_ownership.shares_owned >= amount,
        RwaError::InsufficientShares
    );

    // Transfer SPL tokens from sender to recipient
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.sender_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update sender ownership
    let sender_ownership = &mut ctx.accounts.sender_ownership;
    sender_ownership.shares_owned = sender_ownership
        .shares_owned
        .checked_sub(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;
    sender_ownership.last_transaction_at = clock.unix_timestamp;

    // Update recipient ownership
    let recipient_ownership = &mut ctx.accounts.recipient_ownership;
    let asset = &ctx.accounts.asset;

    if recipient_ownership.shares_owned == 0 {
        recipient_ownership.owner = ctx.accounts.recipient.key();
        recipient_ownership.asset = ctx.accounts.asset.key();
        recipient_ownership.first_purchase_at = clock.unix_timestamp;
        recipient_ownership.avg_purchase_price = asset.price_per_token;
    } else {
        recipient_ownership.avg_purchase_price = recipient_ownership
            .calculate_new_avg_price(amount, asset.price_per_token)
            .ok_or(RwaError::ArithmeticOverflow)?;
    }

    recipient_ownership.shares_owned = recipient_ownership
        .shares_owned
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;
    recipient_ownership.last_transaction_at = clock.unix_timestamp;
    recipient_ownership.last_acquired_slot = clock.slot; // HARDENING: Lock for governance
    recipient_ownership.bump = ctx.bumps.recipient_ownership;

    msg!(
        "Transferred {} shares of '{}' from {} to {}",
        amount,
        asset.name,
        ctx.accounts.sender.key(),
        ctx.accounts.recipient.key()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct TransferShares<'info> {
    /// The sender
    #[account(mut)]
    pub sender: Signer<'info>,

    /// The recipient
    /// CHECK: validated via whitelist PDA
    pub recipient: UncheckedAccount<'info>,

    /// The asset
    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Sender's token account
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = sender,
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    /// Recipient's token account
    #[account(
        mut,
        token::mint = asset.mint,
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Sender's whitelist entry
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, sender.key().as_ref()],
        bump = sender_whitelist.bump,
    )]
    pub sender_whitelist: Account<'info, WhitelistEntry>,

    /// Recipient's whitelist entry
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, recipient.key().as_ref()],
        bump = recipient_whitelist.bump,
    )]
    pub recipient_whitelist: Account<'info, WhitelistEntry>,

    /// Sender's ownership record
    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), sender.key().as_ref()],
        bump = sender_ownership.bump,
    )]
    pub sender_ownership: Account<'info, UserOwnership>,

    /// Recipient's ownership record (init-if-needed for first transfer)
    #[account(
        init_if_needed,
        payer = sender,
        space = 8 + UserOwnership::INIT_SPACE,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), recipient.key().as_ref()],
        bump,
    )]
    pub recipient_ownership: Account<'info, UserOwnership>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
