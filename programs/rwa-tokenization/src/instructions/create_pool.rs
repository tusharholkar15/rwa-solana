use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::errors::RwaError;
use crate::state::{AssetAccount, LiquidityPool, WhitelistEntry};

/// Create an AMM liquidity pool for an active asset
/// Admin initializes the pool, seeds it with initial token + SOL liquidity
pub fn handler(
    ctx: Context<CreatePool>,
    initial_tokens: u64,
    initial_sol: u64,
    fee_bps: u16,
) -> Result<()> {
    let clock = Clock::get()?;

    require!(initial_tokens > 0, RwaError::InvalidAmount);
    require!(initial_sol > 0, RwaError::InvalidAmount);
    require!(fee_bps <= 1000, RwaError::InvalidYieldBps); // Max 10% fee

    let asset = &ctx.accounts.asset;
    require!(asset.is_tradeable(), RwaError::AssetNotActive);

    // Transfer SOL from authority to pool PDA
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.pool.to_account_info(),
            },
        ),
        initial_sol,
    )?;

    // Transfer tokens from authority's token account to pool's token account
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: ctx.accounts.authority_token_account.to_account_info(),
                to: ctx.accounts.pool_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        initial_tokens,
    )?;

    // Mint initial LP tokens to the authority (sqrt(token * sol) as initial LP supply)
    let initial_lp = ((initial_tokens as u128)
        .checked_mul(initial_sol as u128)
        .ok_or(RwaError::ArithmeticOverflow)?)
    .integer_sqrt() as u64;

    let pool_key = ctx.accounts.pool.key();
    let pool_seeds = &[
        LiquidityPool::SEED_PREFIX,
        ctx.accounts.asset.key().as_ref(),
        &[ctx.bumps.pool],
    ];
    let pool_signer = &[&pool_seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.authority_lp_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            pool_signer,
        ),
        initial_lp,
    )?;

    // Initialize pool state
    let pool = &mut ctx.accounts.pool;
    pool.asset = ctx.accounts.asset.key();
    pool.token_reserve = initial_tokens;
    pool.sol_reserve = initial_sol;
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.total_lp_supply = initial_lp;
    pool.fee_bps = fee_bps;
    pool.collected_fees_sol = 0;
    pool.collected_fees_token = 0;
    pool.authority = ctx.accounts.authority.key();
    pool.is_active = true;
    pool.last_k = pool.compute_k();
    pool.volume_24h_sol = 0;
    pool.tvl = initial_sol.checked_mul(2).ok_or(RwaError::ArithmeticOverflow)?;
    pool.last_swap_at = clock.unix_timestamp;
    pool.total_swaps = 0;
    pool.bump = ctx.bumps.pool;

    // Mark asset as having a liquidity pool
    let asset = &mut ctx.accounts.asset;
    asset.has_liquidity_pool = true;

    msg!(
        "Created AMM pool for '{}': {} tokens + {} SOL, fee={}bps, LP={}",
        asset.name,
        initial_tokens,
        initial_sol,
        fee_bps,
        initial_lp
    );

    Ok(())
}

/// Integer square root helper
trait IntegerSqrt {
    fn integer_sqrt(self) -> u128;
}

impl IntegerSqrt for u128 {
    fn integer_sqrt(self) -> u128 {
        if self == 0 {
            return 0;
        }
        let mut x = self;
        let mut y = (x + 1) / 2;
        while y < x {
            x = y;
            y = (x + self / x) / 2;
        }
        x
    }
}

#[derive(Accounts)]
pub struct CreatePool<'info> {
    /// Pool creator (must be admin)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The asset to create a pool for
    #[account(
        mut,
        seeds = [AssetAccount::SEED_PREFIX, asset.authority.as_ref(), asset.name.as_bytes()],
        bump = asset.bump,
    )]
    pub asset: Account<'info, AssetAccount>,

    /// The liquidity pool PDA
    #[account(
        init,
        payer = authority,
        space = 8 + LiquidityPool::INIT_SPACE,
        seeds = [LiquidityPool::SEED_PREFIX, asset.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, LiquidityPool>,

    /// LP token mint (created for this pool)
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = pool,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// Authority's token account for the asset's mint
    #[account(
        mut,
        token::mint = asset.mint,
        token::authority = authority,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,

    /// Pool's token account to hold asset tokens
    #[account(
        init,
        payer = authority,
        token::mint = asset.mint,
        token::authority = pool,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    /// Authority's LP token account
    #[account(
        init,
        payer = authority,
        token::mint = lp_mint,
        token::authority = authority,
    )]
    pub authority_lp_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
