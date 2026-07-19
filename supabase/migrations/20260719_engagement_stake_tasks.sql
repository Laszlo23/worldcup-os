-- MatchMind: XP staking (soft MM mining), community task claims, auto-agent prefs

alter table engagement_passports
  add column if not exists xp_staked integer not null default 0;

alter table engagement_passports
  add column if not exists mm_balance numeric(18, 6) not null default 0;

alter table engagement_passports
  add column if not exists stake_updated_at timestamptz;

create table if not exists engagement_task_claims (
  user_id uuid not null references users (id) on delete cascade,
  task_id text not null,
  xp_awarded integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create index if not exists engagement_task_claims_user_idx
  on engagement_task_claims (user_id);

create table if not exists engagement_auto_agent (
  user_id uuid primary key references users (id) on delete cascade,
  enabled boolean not null default false,
  mode text not null default 'agent' check (mode in ('agent', 'crowd')),
  votes_cast integer not null default 0,
  last_tick_at timestamptz,
  updated_at timestamptz not null default now()
);
