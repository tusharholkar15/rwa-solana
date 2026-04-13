use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, TreasuryVault, UserOwnership, WhitelistEntry};
use crate::instructions::fund_yield::YIELD_PRECISION;

/// Sell fractional shares back to the treasury
/// Burns SPL tokens from seller and returns SOL from treasury
pub fn handler(ctx: Context<SellShares>, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);

    let asset = &ctx.accounts.asset;
    let clock = Clock::get()?;

    // Validate asset is active
    require!(asset.is_active, RwaError::AssetNotActive);

    // Validate whitelist
    let whitelist = &ctx.accounts.seller_whitelist;
    require!(
        whitelist.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
    );

    // Validate seller owns enough shares
    let ownership = &ctx.accounts.user_ownership;
    require!(
        ownership.shares_owned >= amount,
        RwaError::InsufficientShares
    );

    // Calculate sale proceeds in lamports (at current price)
    let sale_proceeds = amount
        .checked_mul(asset.price_per_token)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Transfer SPL tokens from seller back to treasury
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.seller_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        amount,
    )?;

    // Transfer SOL from treasury PDA to seller
    let treasury = &mut ctx.accounts.treasury;
    let treasury_lamports = treasury.to_account_info().lamports();
    require!(
        treasury_lamports >= sale_proceeds,
        RwaError::InsufficientTreasuryBalance
    );

    **treasury.to_account_info().try_borrow_mut_lamports()? -= sale_proceeds;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sale_proceeds;

    // Update asset available supply
    let asset = &mut ctx.accounts.asset;
    asset.available_supply = asset
        .available_supply
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // ── Yield Checkpointing ─────────────────────────────────────
    // Realize current pending yield before share count changes
    {
        let total_acc_scaled = (ownership.shares_owned as u128)
            .checked_mul(asset.accumulated_yield_per_share)
            .ok_or(RwaError::ArithmeticOverflow)?;
        
        let accrued_scaled = total_acc_scaled
            .checked_sub(ownership.yield_debt)
            .ok_or(RwaError::ArithmeticOverflow)?;
        
        // Add lamport portion to unclaimed pool
        ownership.unclaimed_yield_lamports = ownership.unclaimed_yield_lamports
            .checked_add((accrued_scaled / YIELD_PRECISION) as u64)
            .ok_or(RwaError::ArithmeticOverflow)?;
        
        // Retain the remainder in yield_debt
        let remainder = accrued_scaled % YIELD_PRECISION;
        ctx.accounts.user_ownership.yield_debt = remainder; 
    }

    // Update user ownership
    let ownership = &mut ctx.accounts.user_ownership;
    ownership.shares_owned = ownership
        .shares_owned
        .checked_sub(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Set Final Yield Debt for new balance
    ownership.yield_debt = (ownership.shares_owned as u128)
        .checked_mul(asset.accumulated_yield_per_share)
        .ok_or(RwaError::ArithmeticOverflow)?
        .checked_sub(ownership.yield_debt) // subtract the remainder we stored above
        .ok_or(RwaError::ArithmeticOverflow)?;

    ownership.last_transaction_at = clock.unix_timestamp;

    emit!(crate::AssetSold {
        asset: asset.key(),
        seller: ctx.accounts.seller.key(),
        shares: amount,
        total_proceeds: sale_proceeds,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "User {} sold {} shares of '{}' for {} lamports",
        ctx.accounts.seller.key(),
        amount,
        asset.name,
        sale_proceeds
    );

    Ok(())
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    /// The seller
    #[account(mut)]
    pub seller: Signer<'info>,

    /// The asset being sold
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// Treasury vault PDA
    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    /// Treasury's token account
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// Seller's token account
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// Seller's whitelist entry
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, seller.key().as_ref()],
        bump = seller_whitelist.bump,
    )]
    pub seller_whitelist: Account<'info, WhitelistEntry>,

    /// Seller's ownership record
    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), seller.key().as_ref()],
        bump = user_ownership.bump,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
