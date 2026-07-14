-- Unified Superfan Points across World Cup OS, agentx, and MatchMind

ALTER TABLE users ADD COLUMN IF NOT EXISTS superfan_points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS superfan_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_pubkey TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('share', 'task', 'passport', 'agent_deploy', 'agent_win')),
  app TEXT NOT NULL CHECK (app IN ('wmos', 'agentx', 'matchmind')),
  channel TEXT,
  content_type TEXT,
  content_id TEXT,
  points INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_superfan_ledger_user ON superfan_points_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_superfan_ledger_wallet ON superfan_points_ledger(wallet_pubkey, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_superfan_points ON users(superfan_points DESC);
