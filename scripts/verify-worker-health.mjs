#!/usr/bin/env node
/**
 * Verify TxLINE SSE worker is active on production.
 * Usage: BASE_URL=https://wmos.buildingcultureid.space node scripts/verify-worker-health.mjs
 */
const BASE_URL = (process.env.BASE_URL ?? "https://wmos.buildingcultureid.space").replace(/\/$/, "");

async function main() {
  const res = await fetch(`${BASE_URL}/api/health`);
  const body = await res.json();
  const worker = body.worker ?? {};
  const lastSse = body.txline?.lastSseAt ?? worker.lastSseAt;
  console.log(JSON.stringify({ status: body.status, worker, lastSseAt: lastSse }, null, 2));
  if (!worker.healthy && !lastSse) {
    console.error("\nWorker not streaming. On server run: pm2 restart worldcup-worker");
    process.exit(1);
  }
  console.log("\nWorker OK or fixtures synced via cron.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
