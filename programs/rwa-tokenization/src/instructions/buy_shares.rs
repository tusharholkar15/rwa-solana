use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, TreasuryVault, UserOwnership, WhitelistEntry};
use crate::instructions::fund_yield::YIELD_PRECISION;

/// Buy fractional shares of a tokenized asset
/// Transfers SOL from buyer to treasury, and SPL tokens from treasury to buyer
pub fn handler(ctx: Context<BuyShares>, amount: u64) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);

    let asset = &ctx.accounts.asset;
    let clock = Clock::get()?;

    // Validate asset is active
    require!(asset.is_active, RwaError::AssetNotActive);

    // Validate whitelist
    let whitelist = &ctx.accounts.buyer_whitelist;
    require!(
        whitelist.is_valid(clock.unix_timestamp),
        RwaError::NotWhitelisted
    );

    // Validate available supply
    require!(
        asset.available_supply >= amount,
        RwaError::InsufficientSupply
    );

    // Calculate total cost in lamports
    let total_cost = amount
        .checked_mul(asset.price_per_token)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Verify buyer has enough SOL
    require!(
        ctx.accounts.buyer.lamports() >= total_cost,
        RwaError::InsufficientFunds
    );

    // Transfer SOL from buyer to treasury PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        total_cost,
    )?;

    // Transfer SPL tokens from treasury token account to buyer token account
    let treasury_seeds = &[
        TreasuryVault::SEED_PREFIX,
        ctx.accounts.asset.key().as_ref(),
        &[ctx.accounts.treasury.bump],
    ];
    let treasury_signer = &[&treasury_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.treasury_token_account.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.treasury.to_account_info(),
            },
            treasury_signer,
        ),
        amount,
    )?;

    // Update asset available supply
    let asset = &mut ctx.accounts.asset;
    asset.available_supply = asset
        .available_supply
        .checked_sub(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Update treasury
    let treasury = &mut ctx.accounts.treasury;
    treasury.total_collected = treasury
        .total_collected
        .checked_add(total_cost)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // ── Yield Checkpointing ─────────────────────────────────────
    // Realize current pending yield before share count changes
    if ownership.shares_owned > 0 {
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
        
        // Retain the remainder in yield_debt to preserve precision
        let remainder = accrued_scaled % YIELD_PRECISION;
        // Logic: new_debt = (new_shares * acc) - remainder
        // But we update shares below, so we'll do the final debt set after that.
        // We'll store the remainder for now.
        ctx.accounts.user_ownership.yield_debt = remainder; 
    } else {
        ctx.accounts.user_ownership.yield_debt = 0;
    }

    // Update user ownership record
    let ownership = &mut ctx.accounts.user_ownership;
    if ownership.shares_owned == 0 {
        ownership.owner = ctx.accounts.buyer.key();
        ownership.asset = ctx.accounts.asset.key();
        ownership.first_purchase_at = clock.unix_timestamp;
        ownership.avg_purchase_price = asset.price_per_token;
    } else {
        // Calculate new weighted average price
        ownership.avg_purchase_price = ownership
            .calculate_new_avg_price(amount, asset.price_per_token)
            .ok_or(RwaError::ArithmeticOverflow)?;
    }

    ownership.shares_owned = ownership
        .shares_owned
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Set Final Yield Debt for new balance
    // new_debt = (new_shares * acc) - absorbed_remainder
    let absorbed_remainder = ownership.yield_debt; // temporary storage from above
    ownership.yield_debt = (ownership.shares_owned as u128)
        .checked_mul(asset.accumulated_yield_per_share)
        .ok_or(RwaError::ArithmeticOverflow)?
        .checked_sub(absorbed_remainder)
        .ok_or(RwaError::ArithmeticOverflow)?;
    ownership.total_invested = ownership
        .total_invested
        .checked_add(total_cost)
        .ok_or(RwaError::ArithmeticOverflow)?;
    ownership.last_transaction_at = clock.unix_timestamp;
    // Record slot for flash-loan guard (cast_vote checks this)
    ownership.last_acquired_slot = clock.slot;
    ownership.bump = ctx.bumps.user_ownership;

    emit!(crate::AssetBought {
        asset: asset.key(),
        buyer: ctx.accounts.buyer.key(),
        shares: amount,
        total_cost,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "User {} bought {} shares of '{}' for {} lamports",
        ctx.accounts.buyer.key(),
        amount,
        asset.name,
        total_cost
    );

    Ok(())
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    /// The buyer
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// The asset being purchased
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

    /// Buyer's token account for this asset's mint
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// Buyer's whitelist entry (must be KYC verified)
    #[account(
        seeds = [WhitelistEntry::SEED_PREFIX, buyer.key().as_ref()],
        bump = buyer_whitelist.bump,
    )]
    pub buyer_whitelist: Account<'info, WhitelistEntry>,

    /// Buyer's ownership record PDA (init-if-needed for first purchase)
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + UserOwnership::INIT_SPACE,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
