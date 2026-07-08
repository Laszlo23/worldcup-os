-- Optional team metadata bootstrap. Live fixtures come from TxLINE sync.
INSERT INTO statistics (scope, bucket, metrics)
VALUES ('platform', 'bootstrap', '{"source":"txline","serviceLevel":12}'::jsonb)
ON CONFLICT (scope, bucket) DO NOTHING;
