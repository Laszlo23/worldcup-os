-- Live-market + wallet betting tables for AgentX (Prisma schema uses text IDs).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wallet_pubkey TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id TEXT NOT NULL UNIQUE,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  closes_at TIMESTAMPTZ,
  closed BOOLEAN NOT NULL DEFAULT false,
  total_liquidity NUMERIC NOT NULL DEFAULT 0,
  window_opens_at TIMESTAMPTZ,
  resolution_kind TEXT,
  resolved_outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_markets_live_window
  ON markets (match_id, type, closes_at)
  WHERE type LIKE 'live_%';

CREATE TABLE IF NOT EXISTS market_options (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id TEXT NOT NULL,
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 1,
  liquidity NUMERIC NOT NULL DEFAULT 0,
  participants INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(market_id, external_id)
);

CREATE TABLE IF NOT EXISTS wallet_predictions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL REFERENCES market_options(id),
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

CREATE TABLE IF NOT EXISTS wallet_escrows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prediction_id TEXT NOT NULL UNIQUE REFERENCES wallet_predictions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
