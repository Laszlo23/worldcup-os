-- MatchMind sticker album (off-chain engagement earns + goal moment drops)

ALTER TABLE engagement_moments
  ADD COLUMN IF NOT EXISTS sticker_set_id TEXT NOT NULL DEFAULT 'set-goals';

CREATE TABLE IF NOT EXISTS engagement_sticker_defs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  set_id TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'Common',
  image_url TEXT NOT NULL,
  earn_rule TEXT NOT NULL UNIQUE,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_sticker_defs_set ON engagement_sticker_defs(set_id, sort_order);

CREATE TABLE IF NOT EXISTS engagement_user_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id TEXT NOT NULL REFERENCES engagement_sticker_defs(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_ref TEXT,
  UNIQUE (user_id, sticker_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_user_stickers_user ON engagement_user_stickers(user_id, earned_at DESC);

CREATE TABLE IF NOT EXISTS engagement_sticker_set_completions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  set_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, set_id)
);

INSERT INTO engagement_sticker_defs (id, title, description, set_id, rarity, image_url, earn_rule, xp_reward, sort_order)
VALUES
  ('sticker-first-predict', 'First Call', 'Cast your first live prediction', 'set-matchday', 'Common', '/stickers/first-predict.svg', 'first_predict', 25, 1),
  ('sticker-poll-prophet', 'Poll Prophet', 'Win a live TxLINE prediction poll', 'set-matchday', 'Rare', '/stickers/poll-prophet.svg', 'poll_win', 25, 2),
  ('sticker-hot-streak', 'Hot Streak', 'Hit a 3-poll win streak', 'set-matchday', 'Epic', '/stickers/hot-streak.svg', 'streak_3', 25, 3),
  ('sticker-passport-sharer', 'Passport Sharer', 'Share your fan passport', 'set-growth', 'Common', '/stickers/passport-sharer.svg', 'share_passport', 25, 1),
  ('sticker-moment-sharer', 'Moment Sharer', 'Share a goal moment drop', 'set-growth', 'Rare', '/stickers/moment-sharer.svg', 'share_moment', 25, 2),
  ('sticker-stadium-proof', 'Stadium Proof', 'Verify stadium attendance on-chain', 'set-growth', 'Epic', '/stickers/stadium-proof.svg', 'stadium_verify', 25, 3),
  ('sticker-collector-5', 'Collector V', 'Claim 5 goal moment stickers', 'set-growth', 'Legendary', '/stickers/collector-5.svg', 'moments_5', 25, 4)
ON CONFLICT (id) DO NOTHING;
