use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::RwaError;

pub fn handler(
    ctx: Context<EmergencyRecall>,
    amount: u64,
) -> Result<()> {
    let treasury = &ctx.accounts.treasury;
    let strategy = &ctx.accounts.strategy;

    // Institutional Hardening: Verify strategy is whitelisted
    let (whitelist_pda, _bump) = Pubkey::find_program_address(
        &[ReinvestmentWhitelist::SEED_PREFIX, strategy.key().as_ref()],
        ctx.program_id
    );
    require_keys_eq!(ctx.accounts.whitelist.key(), whitelist_pda, RwaError::StrategyNotWhitelisted);

    // Perform Transfer from Strategy to Treasury
    // This assumes the admin has authority over the strategy (e.g., it's a managed vault)
    anchor_lang::solana_program::program::invoke(
        &anchor_lang::solana_program::system_instruction::transfer(
            &strategy.key(),
            &treasury.key(),
            amount,
        ),
        &[
            strategy.to_account_info(),
            treasury.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    msg!("Emergency recall of {} lamports from strategy {} to treasury EXECUTED", amount, strategy.key());
    Ok(())
}

#[derive(Accounts)]
pub struct EmergencyRecall<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// The strategy account to pull funds from
    #[account(mut)]
    pub strategy: Signer<'info>, // Strategy must sign (usually an admin-controlled multisig)

    #[account(
        mut,
        seeds = [TreasuryVault::SEED_PREFIX, asset.key().as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryVault>,

    pub asset: Account<'info, AssetAccount>,

    pub whitelist: Account<'info, ReinvestmentWhitelist>,

    #[account(
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = config.authority == admin.key() @ RwaError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}
