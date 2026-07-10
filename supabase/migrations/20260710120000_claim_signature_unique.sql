-- Prevent replay of the same on-chain signature for claim payouts.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_claim_signature_unique
  ON transactions (signature)
  WHERE type = 'claim' AND signature IS NOT NULL;
