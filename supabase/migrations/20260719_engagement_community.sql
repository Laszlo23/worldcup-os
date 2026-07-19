-- MatchMind community: match-scoped fan chat + light reactions

CREATE TABLE IF NOT EXISTS engagement_fan_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_fan_messages_match_created
  ON engagement_fan_messages (match_id, created_at DESC);

CREATE TABLE IF NOT EXISTS engagement_fan_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '⚽', '😱', '👏', '💚')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_fan_reactions_match_created
  ON engagement_fan_reactions (match_id, created_at DESC);

-- One reaction burst per user every few seconds is enforced in app; allow many over a match.
CREATE INDEX IF NOT EXISTS idx_engagement_fan_reactions_user_recent
  ON engagement_fan_reactions (user_id, created_at DESC);
