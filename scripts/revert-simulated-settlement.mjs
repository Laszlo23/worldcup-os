#!/usr/bin/env node
/**
 * Undo a simulated replay settlement on a real upcoming fixture.
 * Restores match to scheduled, reopens predictions, removes fake proof.
 *
 * Usage: node scripts/revert-simulated-settlement.mjs fx-18209181
 */
import pg from "pg";

const matchExternalId = process.argv[2] ?? "fx-18209181";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  const matchRes = await pool.query("select id from matches where external_id = $1", [matchExternalId]);
  const matchId = matchRes.rows[0]?.id;
  if (!matchId) {
    console.error("Match not found:", matchExternalId);
    process.exit(1);
  }

  await pool.query("BEGIN");

  await pool.query(
    `update predictions set status = 'open', payout = null, claimed = false, updated_at = now()
     where match_id = $1 and status in ('won', 'lost', 'settled')`,
    [matchId],
  );
  await pool.query(
    `update escrows set status = 'locked', released_at = null, updated_at = now()
     where prediction_id in (select id from predictions where match_id = $1)`,
    [matchId],
  );

  await pool.query("delete from proofs where match_id = $1", [matchId]);
  await pool.query("delete from settlements where match_id = $1", [matchId]);

  await pool.query(
    `delete from live_events where match_id = $1
     and event_type in ('settlement_started', 'settlement_finished', 'proof_verified', 'tx_confirmed')`,
    [matchId],
  );

  await pool.query(
    `update matches set status = 'scheduled', score_home = 0, score_away = 0, minute = 0,
     score_seq = 0, updated_at = now() where id = $1`,
    [matchId],
  );

  await pool.query("COMMIT");
  console.log(`Reverted simulated settlement for ${matchExternalId} — match scheduled, predictions open, proof removed.`);
} catch (err) {
  await pool.query("ROLLBACK");
  throw err;
} finally {
  await pool.end();
}
