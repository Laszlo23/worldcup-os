-- Terrace vibe agents (server-signed wallets that chat + vote)
CREATE TABLE IF NOT EXISTS engagement_vibe_agents (
  slug TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_pubkey TEXT NOT NULL UNIQUE,
  persona TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_chat_at TIMESTAMPTZ,
  last_vote_at TIMESTAMPTZ,
  chats_sent INT NOT NULL DEFAULT 0,
  votes_cast INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_vibe_agents_enabled
  ON engagement_vibe_agents (enabled) WHERE enabled = true;
