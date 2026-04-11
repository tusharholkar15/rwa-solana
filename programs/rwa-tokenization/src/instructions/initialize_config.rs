use anchor_lang::prelude::*;

use crate::errors::RwaError;
use crate::state::{ProgramConfig, WhitelistEntry, UserRole};

/// Initialize the global program configuration
/// Called once by the deployer to set up the platform.
pub fn handler(
    ctx: Context<InitializeConfig>,
    protocol_fee_bps: u16,
    max_oracle_staleness: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.upgrade_authority = ctx.accounts.authority.key();
    config.version = 1;
    config.emergency_pause = false;
    config.min_compliance_tier = 1; // Require at least basic KYC
    config.protocol_fee_bps = protocol_fee_bps;
    config.fee_treasury = ctx.accounts.authority.key(); // Initially goes to deployer
    config.max_oracle_staleness = max_oracle_staleness;
    config.max_oracle_spread_bps = 500; // 5% default
    config.governance_enabled = true;
    config.amm_enabled = true;
    config.escrow_enabled = true;
    config.total_assets = 0;
    config.total_users = 0;
    config.total_volume = 0;
    config.bump = ctx.bumps.config;

    msg!(
        "Platform initialized: fee={}bps, oracle_staleness={}s",
        protocol_fee_bps,
        max_oracle_staleness
    );

    Ok(())
}

/// Update the program configuration (admin-only)
pub fn update_handler(
    ctx: Context<UpdateConfig>,
    emergency_pause: Option<bool>,
    protocol_fee_bps: Option<u16>,
    max_oracle_staleness: Option<u64>,
    governance_enabled: Option<bool>,
    amm_enabled: Option<bool>,
    escrow_enabled: Option<bool>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    // Only upgrade authority can modify
    require!(
        ctx.accounts.authority.key() == config.upgrade_authority,
        RwaError::Unauthorized
    );

    if let Some(pause) = emergency_pause {
        config.emergency_pause = pause;
        if pause {
            msg!("⚠️  EMERGENCY PAUSE ACTIVATED");
        } else {
            msg!("✅ Emergency pause deactivated");
        }
    }

    if let Some(fee) = protocol_fee_bps {
        require!(fee <= 1000, RwaError::InvalidYieldBps); // Max 10%
        config.protocol_fee_bps = fee;
    }

    if let Some(staleness) = max_oracle_staleness {
        config.max_oracle_staleness = staleness;
    }

    if let Some(gov) = governance_enabled {
        config.governance_enabled = gov;
    }

    if let Some(amm) = amm_enabled {
        config.amm_enabled = amm;
    }

    if let Some(esc) = escrow_enabled {
        config.escrow_enabled = esc;
    }

    msg!("Program config updated");
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    /// The deployer / upgrade authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Global config PDA
    #[account(
        init,
        payer = authority,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    /// The upgrade authority
    pub authority: Signer<'info>,

    /// Global config PDA
    #[account(
        mut,
        seeds = [ProgramConfig::SEED_PREFIX],
        bump = config.bump,
        constraint = config.upgrade_authority == authority.key() @ RwaError::Unauthorized,
    )]
    pub config: Account<'info, ProgramConfig>,
}
