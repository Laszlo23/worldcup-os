#!/usr/bin/env node
/**
 * Lab-only: simulate replay settlement. Does NOT create verified certificates
 * for fixtures TxLINE still lists as upcoming — use only with ALLOW_SIMULATED_SETTLE=true.
 *
 * For real certificates, wait until TxLINE reports GameState finished (F).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function loadEnv() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const matchExternalId = process.argv[2];
const fixtureId = Number(process.argv[3] ?? matchExternalId?.replace(/^fx-/, ""));

if (!matchExternalId || !fixtureId) {
  console.error("Usage: ALLOW_SIMULATED_SETTLE=true node scripts/run-replay-settle.mjs <matchExternalId> <fixtureId>");
  console.error("Note: verified certificates require TxLINE GameState finished — not for upcoming World Cup fixtures.");
  process.exit(1);
}

if (process.env.ALLOW_SIMULATED_SETTLE !== "true") {
  console.error("Refusing simulated settlement. Set ALLOW_SIMULATED_SETTLE=true for lab replay only.");
  console.error("Upcoming fixtures (e.g. France vs Morocco) cannot receive verified match certificates.");
  process.exit(1);
}

const REPLAY_EVENTS = [
  { minute: 0, gameState: 2, score: { home: 0, away: 0 }, seq: 0 },
  { minute: 23, gameState: 2, score: { home: 1, away: 0 }, seq: 1, eventType: "goal" },
  { minute: 67, gameState: 2, score: { home: 2, away: 0 }, seq: 1, eventType: "goal" },
  { minute: 90, gameState: 5, score: { home: 2, away: 0 }, seq: 1 },
];

async function main() {
  const { processScoreUpdate } = await import("../src/server/services/market-engine.ts");
  const { processSettlementJob, isFixtureFinishedOnTxline } = await import("../src/server/services/settlement.ts");
  const { txlineClient } = await import("../src/server/services/txline/client.ts");

  const finishedOnTxline = await isFixtureFinishedOnTxline(fixtureId);
  if (!finishedOnTxline) {
    console.warn("WARNING: TxLINE still lists this fixture as not finished — any proof will be replay_sim / pending only.");
  }

  console.log(`Simulated replay settle: ${matchExternalId} (fixture ${fixtureId})`);

  for (const event of REPLAY_EVENTS) {
    await processScoreUpdate({
      fixtureId,
      fixture_id: fixtureId,
      minute: event.minute,
      gameState: event.gameState,
      score: event.score,
      seq: event.seq,
      eventType: event.eventType,
    });
  }

  const stat = await txlineClient.getStatValidation(fixtureId, 1, 1);
  console.log("Stat-validation bytes:", stat?.merkleRoot ? "present (structural)" : "missing");

  const result = await processSettlementJob(matchExternalId, fixtureId);
  console.log("Settlement:", JSON.stringify(result));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
