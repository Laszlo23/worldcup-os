-- Fan profile: display name, socials, Human Passport (Gitcoin/Human.tech) score

alter table engagement_passports
  add column if not exists display_name text;

alter table engagement_passports
  add column if not exists socials jsonb not null default '{}'::jsonb;

alter table engagement_passports
  add column if not exists evm_address text;

alter table engagement_passports
  add column if not exists human_passport_score numeric;

alter table engagement_passports
  add column if not exists human_passport_checked_at timestamptz;
