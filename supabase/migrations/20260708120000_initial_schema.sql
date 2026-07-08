-- World Cup OS production schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users & wallets
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pubkey TEXT NOT NULL UNIQUE,
  nickname TEXT,
  avatar TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pubkey TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, pubkey)
);

-- Matches & events
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  txline_fixture_id BIGINT,
  home_team JSONB NOT NULL,
  away_team JSONB NOT NULL,
  score_home INT NOT NULL DEFAULT 0,
  score_away INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  minute INT NOT NULL DEFAULT 0,
  stadium TEXT,
  stage TEXT,
  kickoff_at TIMESTAMPTZ,
  stats JSONB NOT NULL DEFAULT '{}',
  odds JSONB NOT NULL DEFAULT '{}',
  odds_history JSONB NOT NULL DEFAULT '[]',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  external_id TEXT,
  txline_seq BIGINT,
  minute INT NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  team_id TEXT,
  player TEXT,
  detail TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Markets
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  closes_at TIMESTAMPTZ,
  closed BOOLEAN NOT NULL DEFAULT false,
  total_liquidity NUMERIC NOT NULL DEFAULT 0,
  on_chain_market_pda TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 1,
  liquidity NUMERIC NOT NULL DEFAULT 0,
  participants INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(market_id, external_id)
);

-- Predictions & escrows
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES market_options(id),
  outcome_label TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  payout NUMERIC,
  claimed BOOLEAN NOT NULL DEFAULT false,
  escrow_pda TEXT,
  tx_signature TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL UNIQUE REFERENCES predictions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked',
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settlements & proofs
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  merkle_root TEXT NOT NULL,
  proof_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  solana_tx TEXT,
  explorer_url TEXT,
  final_score_home INT,
  final_score_away INT,
  validated_at TIMESTAMPTZ,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications & live feed
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaderboard & statistics
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  rank INT NOT NULL,
  profit NUMERIC NOT NULL DEFAULT 0,
  roi NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  correct INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  volume NUMERIC NOT NULL DEFAULT 0,
  biggest_win NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period)
);

CREATE TABLE IF NOT EXISTS statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  bucket TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope, bucket)
);

-- Worker jobs
CREATE TABLE IF NOT EXISTS worker_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_match ON markets(match_id);
CREATE INDEX IF NOT EXISTS idx_markets_closed ON markets(closed);
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_proofs_match ON proofs(match_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_live_events_match ON live_events(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_rank ON leaderboard(period, rank);
CREATE INDEX IF NOT EXISTS idx_worker_jobs_status ON worker_jobs(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','wallets','matches','match_events','markets','market_options',
    'predictions','escrows','settlements','proofs','transactions',
    'notifications','live_events','leaderboard','statistics','worker_jobs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_jobs ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY public_read_matches ON matches FOR SELECT USING (true);
CREATE POLICY public_read_match_events ON match_events FOR SELECT USING (true);
CREATE POLICY public_read_markets ON markets FOR SELECT USING (true);
CREATE POLICY public_read_market_options ON market_options FOR SELECT USING (true);
CREATE POLICY public_read_proofs ON proofs FOR SELECT USING (true);
CREATE POLICY public_read_leaderboard ON leaderboard FOR SELECT USING (true);
CREATE POLICY public_read_statistics ON statistics FOR SELECT USING (true);
CREATE POLICY public_read_live_events ON live_events FOR SELECT USING (true);
CREATE POLICY public_read_settlements ON settlements FOR SELECT USING (true);

-- Service role bypass (handled by service key); anon users read-only above
CREATE POLICY users_read_own ON users FOR SELECT USING (true);
CREATE POLICY predictions_read_own ON predictions FOR SELECT USING (true);
CREATE POLICY notifications_read_own ON notifications FOR SELECT USING (true);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE live_events;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE market_options;
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
