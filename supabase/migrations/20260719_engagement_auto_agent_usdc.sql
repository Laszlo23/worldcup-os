-- Agent Pilot: USDC budget for on-chain market predictions
alter table engagement_auto_agent
  add column if not exists usdc_markets boolean not null default false;

alter table engagement_auto_agent
  add column if not exists usdc_budget numeric(18, 6) not null default 0;

alter table engagement_auto_agent
  add column if not exists usdc_spent numeric(18, 6) not null default 0;

alter table engagement_auto_agent
  add column if not exists usdc_stake numeric(18, 6) not null default 5;

alter table engagement_auto_agent
  add column if not exists markets_placed integer not null default 0;
