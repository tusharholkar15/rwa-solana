use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, TreasuryVault, PriceHistory};

/// Initialize a new tokenized real-world asset
/// Creates the asset PDA, SPL token mint, treasury vault, and treasury token account
pub fn handler(
    ctx: Context<InitializeAsset>,
    name: String,
    symbol: String,
    uri: String,
    total_supply: u64,
    price_per_token: u64,
    annual_yield_bps: u16,
) -> Result<()> {
    // Validate inputs
    require!(name.len() <= 64, RwaError::NameTooLong);
    require!(symbol.len() <= 10, RwaError::SymbolTooLong);
    require!(uri.len() <= 200, RwaError::UriTooLong);
    require!(total_supply > 0, RwaError::InvalidTotalSupply);
    require!(price_per_token > 0, RwaError::InvalidPrice);
    require!(annual_yield_bps <= 10_000, RwaError::InvalidYieldBps);

    let clock = Clock::get()?;

    // Initialize the asset account
    let asset = &mut ctx.accounts.asset;
    asset.authority = ctx.accounts.authority.key();
    asset.name = name;
    asset.symbol = symbol;
    asset.uri = uri;
    asset.mint = ctx.accounts.mint.key();
    asset.total_supply = total_supply;
    asset.available_supply = total_supply;
    asset.price_per_token = price_per_token;
    asset.annual_yield_bps = annual_yield_bps;
    asset.total_yield_distributed = 0;
    asset.oracle_feed_id = [0u8; 32]; // Set later via update_price
    asset.is_active = true;
    asset.created_at = clock.unix_timestamp;
    asset.last_price_update = clock.unix_timestamp;
    asset.bump = ctx.bumps.asset;

    // Initialize the treasury vault
    let treasury = &mut ctx.accounts.treasury;
    treasury.asset = asset.key();
    treasury.authority = ctx.accounts.authority.key();
    treasury.total_collected = 0;
    treasury.total_yield_distributed = 0;
    treasury.total_withdrawn = 0;
    treasury.available_for_yield = 0;
    treasury.bump = ctx.bumps.treasury;

    // Initialize the price history
    let price_history = &mut ctx.accounts.price_history;
    price_history.asset = asset.key();
    price_history.head = 0;
    price_history.count = 0;
    price_history.bump = ctx.bumps.price_history;

    // Mint the total supply to the treasury token account
    let asset_key = ctx.accounts.asset.key();
    let seeds = &[
        AssetAccount::SEED_PREFIX,
        ctx.accounts.authority.key.as_ref(),
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
        total_supply,
    )?;

    msg!(
        "Asset '{}' initialized with {} tokens at {} lamports each",
        ctx.accounts.asset.name,
        total_supply,
        price_per_token
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String)]
pub struct InitializeAsset<'info> {
    /// The admin creating the asset
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The asset account PDA
    #[account(
        init,
        payer = authority,
        space = 8 + AssetAccount::INIT_SPACE,
        seeds = [AssetAccount::SEED_PREFIX, authority.key().as_ref(), name.as_bytes()],
        bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The SPL token mint for this asset's fractional tokens
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = asset,
        mint::freeze_authority = asset,
    )]
    pub mint: Account<'info, Mint>,

    /// Treasury vault PDA
    #[account(
        init,
        payer = authority,
        space = 8 + TreasuryVault::INIT_SPACE,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    /// Treasury's token account to hold the minted supply
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// PDA to store historical price points for TWAP fallback
    #[account(
        init,
        payer = authority,
        space = 8 + PriceHistory::INIT_SPACE,
        seeds = [PriceHistory::SEED_PREFIX, asset.key().as_ref()],
        bump
    )]
    pub price_history: Account<'info, PriceHistory>,

    /// Standard programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
