-- Ball News engagement (keyed by stable post_key from client feed)
CREATE TABLE IF NOT EXISTS engagement_blog_meta (
  post_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'desk',
  kicker TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL,
  lede TEXT NOT NULL DEFAULT '',
  body TEXT,
  image_url TEXT,
  match_external_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engagement_blog_likes (
  post_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_blog_likes_post
  ON engagement_blog_likes (post_key);

CREATE TABLE IF NOT EXISTS engagement_blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_blog_comments_post
  ON engagement_blog_comments (post_key, created_at DESC);

-- Referrals
CREATE TABLE IF NOT EXISTS engagement_referral_codes (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engagement_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rewarded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified_at TIMESTAMPTZ,
  CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_referrals_referrer
  ON engagement_referrals (referrer_id, created_at DESC);

-- Follow predictors
CREATE TABLE IF NOT EXISTS engagement_follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_follows_followee
  ON engagement_follows (followee_id, created_at DESC);
