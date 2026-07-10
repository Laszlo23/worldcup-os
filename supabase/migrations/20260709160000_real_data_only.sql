-- Tag data origin and remove hackathon demo seed from production-facing tables.

ALTER TABLE live_events ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'txline';
ALTER TABLE proofs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'txline';

UPDATE proofs SET source = 'demo' WHERE signature ILIKE '%demo%';

UPDATE live_events SET source = 'demo'
WHERE title IN (
  'GOAL · Argentina 2–1 Brazil',
  'MARKET ENGINE · Odds shift',
  'MARKET ENGINE · Auto-close',
  'SETTLEMENT · Solana escrow',
  'PROOF · Merkle root verified',
  'GOAL · France 1–1 Germany',
  'ODDS · Draw market',
  'ON-CHAIN · Escrow confirmed',
  'SETTLEMENT · Processing',
  'PROOF · Certificate ready'
);

DELETE FROM live_events WHERE source = 'demo';
DELETE FROM proofs WHERE source = 'demo';

DELETE FROM leaderboard
WHERE user_id IN (
  SELECT id FROM users WHERE wallet_pubkey IN (
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    '9aBzK3mN8pQr2sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq',
    '3FpqR7sT1uVwXyZ2aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    'Hn2Mk5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq',
    'Cw8Rk2mN5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNo'
  )
);

DELETE FROM users WHERE wallet_pubkey IN (
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  '9aBzK3mN8pQr2sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq',
  '3FpqR7sT1uVwXyZ2aBcDeFgHiJkLmNoPqRsTuVwXyZ',
  'Hn2Mk5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq',
  'Cw8Rk2mN5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNo'
);

-- Demo-only fixture rows from seed/replay presets.
DELETE FROM match_events WHERE match_id IN (
  SELECT id FROM matches WHERE txline_fixture_id IN (900001, 900002, 900007)
);
DELETE FROM markets WHERE match_id IN (
  SELECT id FROM matches WHERE txline_fixture_id IN (900001, 900002, 900007)
);
DELETE FROM matches WHERE txline_fixture_id IN (900001, 900002, 900007);

CREATE INDEX IF NOT EXISTS idx_live_events_source ON live_events(source);
CREATE INDEX IF NOT EXISTS idx_proofs_source ON proofs(source);
