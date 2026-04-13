use anchor_lang::prelude::*;
use crate::state::UserOwnership;
use crate::errors::RwaError;

#[derive(Accounts)]
pub struct SetCompoundingPreference<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [UserOwnership::SEED_PREFIX, ownership.asset.as_ref(), owner.key().as_ref()],
        bump = ownership.bump,
        constraint = ownership.owner == owner.key() @ RwaError::Unauthorized,
    )]
    pub ownership: Account<'info, UserOwnership>,
}

pub fn handler(
    ctx: Context<SetCompoundingPreference>,
    enabled: bool,
    threshold: u64,
) -> Result<()> {
    let ownership = &mut ctx.accounts.ownership;
    
    ownership.auto_compound_enabled = enabled;
    ownership.min_compound_threshold = threshold;

    msg!(
        "Compounding updated for owner {}: enabled={}, threshold={}",
        ownership.owner,
        enabled,
        threshold
    );

    Ok(())
}
