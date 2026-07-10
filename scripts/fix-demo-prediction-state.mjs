#!/usr/bin/env node
/**
 * Remove misleading presenter demo rows (fake France win before kickoff).
 * Keeps real on-chain predictions untouched.
 */
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");

  const demoPred = await client.query(
    `select id from predictions where external_id = 'pred_present_demo'`,
  );
  if (demoPred.rows[0]) {
    const predId = demoPred.rows[0].id;
    await client.query("delete from escrows where prediction_id = $1", [predId]);
    await client.query(
      "delete from transactions where metadata->>'predictionExternalId' = 'pred_present_demo'",
    );
    await client.query("delete from predictions where id = $1", [predId]);
    console.log("Removed pred_present_demo");
  }

  const removedEvents = await client.query(`
    delete from live_events
    where event_type in ('settlement', 'proof_verified', 'settlement_finished')
       or body ilike '%wins ·%'
       or body ilike '%payout ready to claim%'
    returning id
  `);
  console.log("Removed misleading live events:", removedEvents.rowCount);

  await client.query("COMMIT");
  console.log("Done — scheduled fixtures no longer show fake winners.");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  await client.end();
}
