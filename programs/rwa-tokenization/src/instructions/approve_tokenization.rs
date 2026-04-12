use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, AssetLifecycleStatus, TreasuryVault, MultiVerification};

/// Approve tokenization — transitions a Verified asset to Tokenized → Active
/// Mints SPL tokens to the treasury. Only callable by the asset authority (admin).
/// HARDENING: Now requires 2-of-3 multi-signature verification approval.
pub fn handler(ctx: Context<ApproveTokenization>) -> Result<()> {
    let clock = Clock::get()?;
    let asset = &ctx.accounts.asset;
    let multi_verification = &ctx.accounts.multi_verification;

    // Must be the asset authority
    require!(
        ctx.accounts.authority.key() == asset.authority,
        RwaError::Unauthorized
    );

    // Asset must be in Verified state
    require!(
        asset.lifecycle_status == AssetLifecycleStatus::Verified,
        RwaError::InvalidLifecycleStatus
    );

    // HARDENING: Verify multi-sig threshold has been met
    require!(
        multi_verification.is_approved(),
        RwaError::InvalidLifecycleStatus
    );
    require!(
        multi_verification.asset == asset.key(),
        RwaError::Unauthorized
    );

    // Fraud score must be acceptable
    require!(asset.fraud_score <= 30, RwaError::FraudScoreTooHigh);

    // Must have at least 1 verified document
    require!(asset.legal_doc_count > 0, RwaError::InvalidLifecycleStatus);

    // Mint tokens to treasury
    let authority_key = ctx.accounts.authority.key();
    let seeds = &[
        AssetAccount::SEED_PREFIX,
        authority_key.as_ref(),
        ctx.accounts.asset.name.as_bytes(),
        &[ctx.accounts.asset.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.asset.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.asset.total_supply,
    )?;

    // Transition to Active (skip Tokenized intermediate for simplicity)
    let asset = &mut ctx.accounts.asset;
    asset.lifecycle_status = AssetLifecycleStatus::Active;
    asset.is_active = true;

    msg!(
        "Asset '{}' tokenized and activated — {} tokens minted (Multi-Sig Verified)",
        asset.name,
        asset.total_supply
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ApproveTokenization<'info> {
    /// The asset authority (admin)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The asset to tokenize
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Multi-verification record (must be approved)
    #[account(
        seeds = [MultiVerification::SEED_PREFIX, asset.key().as_ref()],
        bump = multi_verification.bump,
    )]
    pub multi_verification: Account<'info, MultiVerification>,

    /// The SPL token mint for this asset
    #[account(
        mut,
        constraint = mint.key() == asset.mint @ RwaError::InvalidOracleFeed,
    )]
    pub mint: Account<'info, Mint>,

    /// Treasury vault PDA
    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    /// Treasury's token account to receive minted tokens
    #[account(
        mut,
        token::mint = mint,
        token::authority = treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
