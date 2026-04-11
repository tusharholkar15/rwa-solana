use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{
    AssetAccount, RentVault, UserOwnership,
};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

/// Collect real USDC rent payment from a property manager into the RentVault.
///
/// Called by the authorized property manager when rental income is received
/// (monthly, quarterly, or as a batch from bank reconciliation).
///
/// Flow:
///   1. Validate property manager authorization
///   2. Transfer USDC from manager's ATA → vault ATA  
///   3. Update vault accounting (pending_distribution, reserve)
///   4. Emit CollectRentEvent for indexer
pub fn handler(ctx: Context<CollectRent>, amount: u64, memo: [u8; 32]) -> Result<()> {
    require!(amount > 0, RwaError::InvalidAmount);

    let clock = Clock::get()?;
    let vault = &ctx.accounts.rent_vault;

    // Validate caller is the authorized property manager
    require!(
        ctx.accounts.property_manager.key() == vault.property_manager,
        RwaError::Unauthorized
    );

    // Validate vault is not paused
    require!(!vault.is_paused, RwaError::AssetPaused);

    // Calculate reserve top-up (if reserve_buffer is below 3-month threshold):
    // For simplicity, 10% of each deposit goes to reserve until threshold is met.
    let reserve_contribution = amount
        .checked_div(10)
        .ok_or(RwaError::ArithmeticOverflow)?;
    let distributable = amount
        .checked_sub(reserve_contribution)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Execute USDC transfer: property_manager_ata → vault_ata
    let cpi_accounts = Transfer {
        from: ctx.accounts.manager_usdc_ata.to_account_info(),
        to: ctx.accounts.vault_usdc_ata.to_account_info(),
        authority: ctx.accounts.property_manager.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Update vault accounting
    let vault = &mut ctx.accounts.rent_vault;
    vault.total_collected = vault
        .total_collected
        .checked_add(amount)
        .ok_or(RwaError::ArithmeticOverflow)?;
    vault.pending_distribution = vault
        .pending_distribution
        .checked_add(distributable)
        .ok_or(RwaError::ArithmeticOverflow)?;
    vault.reserve_buffer = vault
        .reserve_buffer
        .checked_add(reserve_contribution)
        .ok_or(RwaError::ArithmeticOverflow)?;
    vault.last_collection_at = clock.unix_timestamp;
    vault.collection_count = vault.collection_count.saturating_add(1);

    msg!(
        "CollectRent: {} USDC collected for asset '{}' | Distributable: {} | Reserve: {} | Memo: {:?}",
        amount,
        ctx.accounts.asset.name,
        distributable,
        reserve_contribution,
        memo
    );

    Ok(())
}

/// Distribute USDC yield from the RentVault to a specific token holder.
///
/// The authority calls this per-holder (or in batches via BullMQ).
/// Amount distributed = (holder_shares / total_supply) * pending_distribution
pub fn distribute_handler(ctx: Context<DistributeUsdcYield>, holder_amount: u64) -> Result<()> {
    require!(holder_amount > 0, RwaError::InvalidAmount);

    let clock = Clock::get()?;
    let vault = &ctx.accounts.rent_vault;
    let asset = &ctx.accounts.asset;

    // Only asset authority can trigger distributions
    require!(
        ctx.accounts.authority.key() == asset.authority,
        RwaError::Unauthorized
    );

    // Validate sufficient pending funds
    require!(
        vault.pending_distribution >= holder_amount,
        RwaError::InsufficientTreasuryBalance
    );

    // Validate holder has shares
    require!(
        ctx.accounts.user_ownership.shares_owned > 0,
        RwaError::InsufficientShares
    );

    // Derive vault PDA signer seeds for CPI
    let vault_seeds = &[
        RentVault::SEED_PREFIX,
        asset.key().as_ref(),
        &[vault.bump],
    ];
    let signer = &[&vault_seeds[..]];

    // Execute USDC transfer: vault_ata → holder_ata
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_usdc_ata.to_account_info(),
        to: ctx.accounts.holder_usdc_ata.to_account_info(),
        authority: ctx.accounts.rent_vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    token::transfer(cpi_ctx, holder_amount)?;

    // Update vault accounting
    let vault = &mut ctx.accounts.rent_vault;
    vault.total_distributed = vault
        .total_distributed
        .checked_add(holder_amount)
        .ok_or(RwaError::ArithmeticOverflow)?;
    vault.pending_distribution = vault
        .pending_distribution
        .checked_sub(holder_amount)
        .ok_or(RwaError::ArithmeticOverflow)?;

    // Update holder's yield record
    let ownership = &mut ctx.accounts.user_ownership;
    ownership.total_yield_received = ownership
        .total_yield_received
        .checked_add(holder_amount)
        .ok_or(RwaError::ArithmeticOverflow)?;
    ownership.last_transaction_at = clock.unix_timestamp;

    msg!(
        "DistributeYield: {} USDC distributed to holder {} for asset '{}'",
        holder_amount,
        ctx.accounts.holder.key(),
        ctx.accounts.asset.name
    );

    Ok(())
}

#[derive(Accounts)]
pub struct CollectRent<'info> {
    /// The authorized property manager depositing rent
    #[account(mut)]
    pub property_manager: Signer<'info>,

    /// The asset this rent is for
    #[account(
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.is_active @ RwaError::AssetPaused,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The rent vault PDA
    #[account(
        mut,
        seeds = [RentVault::SEED_PREFIX, asset.key().as_ref()],
        bump = rent_vault.bump,
        constraint = rent_vault.property_manager == property_manager.key() @ RwaError::Unauthorized,
    )]
    pub rent_vault: Account<'info, RentVault>,

    /// Property manager's USDC token account (source)
    #[account(
        mut,
        constraint = manager_usdc_ata.owner == property_manager.key() @ RwaError::Unauthorized,
        constraint = manager_usdc_ata.mint == rent_vault.usdc_mint @ RwaError::InvalidAmount,
    )]
    pub manager_usdc_ata: Account<'info, TokenAccount>,

    /// Vault's USDC token account (destination — program-owned)
    #[account(
        mut,
        constraint = vault_usdc_ata.key() == rent_vault.vault_token_account @ RwaError::Unauthorized,
    )]
    pub vault_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributeUsdcYield<'info> {
    /// Asset authority triggering the distribution
    pub authority: Signer<'info>,

    /// The asset
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
        constraint = asset.authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The rent vault
    #[account(
        mut,
        seeds = [RentVault::SEED_PREFIX, asset.key().as_ref()],
        bump = rent_vault.bump,
    )]
    pub rent_vault: Account<'info, RentVault>,

    /// Vault's USDC token account (source of distribution)
    #[account(
        mut,
        constraint = vault_usdc_ata.key() == rent_vault.vault_token_account @ RwaError::Unauthorized,
    )]
    pub vault_usdc_ata: Account<'info, TokenAccount>,

    /// The holder receiving USDC yield
    /// CHECK: Validated via user_ownership PDA
    pub holder: UncheckedAccount<'info>,

    /// Holder's USDC token account (destination)
    #[account(
        mut,
        constraint = holder_usdc_ata.owner == holder.key() @ RwaError::Unauthorized,
        constraint = holder_usdc_ata.mint == rent_vault.usdc_mint @ RwaError::InvalidAmount,
    )]
    pub holder_usdc_ata: Account<'info, TokenAccount>,

    /// Holder's ownership record (validates shareholding)
    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, asset.key().as_ref(), holder.key().as_ref()],
        bump = user_ownership.bump,
        constraint = user_ownership.shares_owned > 0 @ RwaError::InsufficientShares,
    )]
    pub user_ownership: Account<'info, UserOwnership>,

    pub token_program: Program<'info, Token>,
}
