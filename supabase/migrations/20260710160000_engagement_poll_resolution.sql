-- Poll resolution kind for TxLINE-driven outcomes

ALTER TABLE engagement_polls
  ADD COLUMN IF NOT EXISTS resolution_kind TEXT;

CREATE INDEX IF NOT EXISTS idx_engagement_polls_open
  ON engagement_polls (match_id, closes_at)
  WHERE outcome IS NULL;
