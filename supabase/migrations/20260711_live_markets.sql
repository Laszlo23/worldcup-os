-- Live in-play USDC markets (7-minute windows)
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS window_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_kind TEXT,
  ADD COLUMN IF NOT EXISTS resolved_outcome TEXT;

CREATE INDEX IF NOT EXISTS idx_markets_live_window
  ON markets (match_id, type, closes_at)
  WHERE type LIKE 'live_%';
