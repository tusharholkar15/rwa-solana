use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("RWATokenXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod rwa_tokenization {
    use super::*;

    /// Initialize a new tokenized real-world asset
    /// Creates the asset account, SPL token mint, and treasury vault
    pub fn initialize_asset(
        ctx: Context<InitializeAsset>,
        name: String,
        symbol: String,
        uri: String,
        total_supply: u64,
        price_per_token: u64,
        annual_yield_bps: u16,
    ) -> Result<()> {
        instructions::initialize_asset::handler(
            ctx,
            name,
            symbol,
            uri,
            total_supply,
            price_per_token,
            annual_yield_bps,
        )
    }

    /// Whitelist a KYC-verified user for trading
    pub fn whitelist_user(ctx: Context<WhitelistUser>) -> Result<()> {
        instructions::whitelist_user::handler(ctx)
    }

    /// Remove a user from the whitelist
    pub fn remove_whitelist(ctx: Context<RemoveWhitelist>) -> Result<()> {
        instructions::whitelist_user::remove_handler(ctx)
    }

    /// Buy fractional shares of a tokenized asset
    pub fn buy_shares(ctx: Context<BuyShares>, amount: u64) -> Result<()> {
        instructions::buy_shares::handler(ctx, amount)
    }

    /// Sell fractional shares back to the treasury
    pub fn sell_shares(ctx: Context<SellShares>, amount: u64) -> Result<()> {
        instructions::sell_shares::handler(ctx, amount)
    }

    /// Transfer shares between whitelisted users
    pub fn transfer_shares(ctx: Context<TransferShares>, amount: u64) -> Result<()> {
        instructions::transfer_shares::handler(ctx, amount)
    }

    /// Distribute yield to all token holders of an asset
    pub fn distribute_yield(ctx: Context<DistributeYield>, amount: u64) -> Result<()> {
        instructions::distribute_yield::handler(ctx, amount)
    }

    /// Update asset price from Pyth oracle feed
    pub fn update_price(ctx: Context<UpdatePrice>) -> Result<()> {
        instructions::update_price::handler(ctx)
    }
}
