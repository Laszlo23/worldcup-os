-- On-chain receipt for XP poll votes (memo signature)
ALTER TABLE engagement_poll_votes
  ADD COLUMN IF NOT EXISTS tx_signature TEXT;

CREATE INDEX IF NOT EXISTS idx_engagement_poll_votes_tx
  ON engagement_poll_votes (tx_signature)
  WHERE tx_signature IS NOT NULL;
