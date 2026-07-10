-- MatchMind engagement tables (shared Postgres with World Cup OS)

CREATE TABLE IF NOT EXISTS engagement_passports (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  predictions_total INTEGER NOT NULL DEFAULT 0,
  predictions_won INTEGER NOT NULL DEFAULT 0,
  moments_claimed INTEGER NOT NULL DEFAULT 0,
  stadium_verified INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engagement_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  question TEXT NOT NULL,
  window_label TEXT NOT NULL DEFAULT 'Next 2 min',
  window_seconds INTEGER NOT NULL DEFAULT 120,
  closes_at TIMESTAMPTZ NOT NULL,
  yes_reward INTEGER NOT NULL DEFAULT 25,
  no_reward INTEGER NOT NULL DEFAULT 15,
  outcome TEXT CHECK (outcome IN ('yes', 'no', 'void')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_polls_match ON engagement_polls(match_id, closes_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_polls_event_key ON engagement_polls(match_id, event_key);

CREATE TABLE IF NOT EXISTS engagement_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES engagement_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  choice TEXT NOT NULL CHECK (choice IN ('yes', 'no')),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS engagement_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_key TEXT,
  title TEXT NOT NULL,
  player TEXT,
  minute INTEGER,
  rarity TEXT NOT NULL DEFAULT 'Common',
  image_url TEXT,
  serial_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_moments_match ON engagement_moments(match_id, created_at DESC);

CREATE TABLE IF NOT EXISTS engagement_moment_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES engagement_moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_signature TEXT NOT NULL,
  metadata_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (moment_id, user_id)
);

CREATE TABLE IF NOT EXISTS engagement_stadium_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tx_signature TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE TABLE IF NOT EXISTS engagement_reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_external_id TEXT NOT NULL,
  xp_spent INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_reward_redemptions_user ON engagement_reward_redemptions(user_id, created_at DESC);
