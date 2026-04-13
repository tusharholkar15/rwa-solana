use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::RwaError;

pub fn handler(
    ctx: Context<AddToReinvestmentWhitelist>,
    name: String,
    risk_level: u8,
) -> Result<()> {
    let whitelist = &mut ctx.accounts.whitelist;
    
    whitelist.strategy_address = ctx.accounts.strategy_address.key();
    whitelist.name = name;
    whitelist.risk_level = risk_level;
    whitelist.is_active = true;
    whitelist.added_by = ctx.accounts.admin.key();
    whitelist.added_at = Clock::get()?.unix_timestamp;
    whitelist.bump = *ctx.bumps.get("whitelist").unwrap();

    msg!("Strategy {} added to reinvestment whitelist by admin", whitelist.strategy_address);
    Ok(())
}

#[derive(Accounts)]
pub struct AddToReinvestmentWhitelist<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// The external protocol address to whitelist
    /// CHECK: This is the target strategy address, doesn't need to be an account
    pub strategy_address: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + ReinvestmentWhitelist::INIT_SPACE,
        seeds = [ReinvestmentWhitelist::SEED_PREFIX, strategy_address.key().as_ref()],
        bump
    )]
    pub whitelist: Account<'info, ReinvestmentWhitelist>,

    /// Global platform config to verify admin role
    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = config.authority == admin.key() @ RwaError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}
