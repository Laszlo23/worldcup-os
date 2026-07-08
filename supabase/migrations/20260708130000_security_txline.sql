-- Auth nonces (replay protection)
CREATE TABLE IF NOT EXISTS auth_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pubkey TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_nonces_wallet ON auth_nonces(wallet_pubkey);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_expires ON auth_nonces(expires_at);

-- TxLINE credential storage (server-managed)
CREATE TABLE IF NOT EXISTS txline_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_level INTEGER NOT NULL DEFAULT 12,
  guest_jwt TEXT NOT NULL,
  api_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  activation_tx_sig TEXT,
  last_sse_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_txline_credentials_active ON txline_credentials(service_level);

-- Rate limit buckets (optional persistent rate limiting)
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- Owner-scoped RLS for predictions (when using JWT via service role, app enforces session)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS predictions_owner_read ON predictions;
CREATE POLICY predictions_owner_read ON predictions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS predictions_owner_insert ON predictions;
CREATE POLICY predictions_owner_insert ON predictions
  FOR INSERT
  WITH CHECK (true);
