use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6");

#[program]
pub mod worldcup_os {
    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket>, match_id: String, market_type: String) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.match_id = match_id;
        market.market_type = market_type;
        market.settled = false;
        Ok(())
    }

    pub fn place_prediction(ctx: Context<PlacePrediction>, amount: u64, outcome_id: String) -> Result<()> {
        let prediction = &mut ctx.accounts.prediction;
        prediction.user = ctx.accounts.user.key();
        prediction.market = ctx.accounts.market.key();
        prediction.amount = amount;
        prediction.outcome_id = outcome_id;
        prediction.claimed = false;

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts), amount)?;
        Ok(())
    }

    pub fn settle_market(ctx: Context<SettleMarket>, proof_hash: [u8; 32], merkle_root: [u8; 32]) -> Result<()> {
        require!(!ctx.accounts.market.settled, ErrorCode::AlreadySettled);

        let market_key = ctx.accounts.market.key();
        let authority_key = ctx.accounts.authority.key();

        // CPI to txoracle validateStat (permissionless crank passes proof bytes)
        let ix = Instruction {
            program_id: ctx.accounts.txoracle_program.key(),
            accounts: vec![
                AccountMeta::new_readonly(market_key, false),
                AccountMeta::new_readonly(authority_key, true),
            ],
            data: [vec![0], proof_hash.to_vec(), merkle_root.to_vec()].concat(),
        };
        invoke(
            &ix,
            &[
                ctx.accounts.market.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.txoracle_program.to_account_info(),
            ],
        )?;

        let market = &mut ctx.accounts.market;
        market.settled = true;
        market.proof_hash = proof_hash;
        market.merkle_root = merkle_root;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let prediction = &mut ctx.accounts.prediction;
        let market = &ctx.accounts.market;
        require!(market.settled, ErrorCode::MarketNotSettled);
        require!(!prediction.claimed, ErrorCode::AlreadyClaimed);

        let amount = prediction.amount;
        let market_key = market.key();
        let user_key = prediction.user;
        let seeds = &[
            b"escrow",
            market_key.as_ref(),
            user_key.as_ref(),
            &[ctx.bumps.escrow_authority],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer),
            amount,
        )?;

        prediction.claimed = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(init, payer = authority, space = 8 + Market::INIT_SPACE)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlacePrediction<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(init, payer = user, space = 8 + Prediction::INIT_SPACE)]
    pub prediction: Account<'info, Prediction>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// CHECK: txoracle program id
    pub txoracle_program: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, has_one = market)]
    pub prediction: Account<'info, Prediction>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA signer for escrow vault
    #[account(seeds = [b"escrow", market.key().as_ref(), user.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Market {
    pub authority: Pubkey,
    pub match_id: String,
    pub market_type: String,
    pub settled: bool,
    pub proof_hash: [u8; 32],
    pub merkle_root: [u8; 32],
}

impl Market {
    pub const INIT_SPACE: usize = 32 + 4 + 64 + 4 + 32 + 1 + 32 + 32;
}

#[account]
pub struct Prediction {
    pub user: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
    pub outcome_id: String,
    pub claimed: bool,
}

impl Prediction {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 4 + 64 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Market already settled")]
    AlreadySettled,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Market not settled")]
    MarketNotSettled,
}
