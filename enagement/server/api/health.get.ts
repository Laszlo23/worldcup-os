import { defineHandler } from "nitro";
import { txlineClient } from "@shared/server/services/txline/client";
import { assertProductionSecrets, hasDatabase, hasWebacy } from "@shared/server/config/env";
import { maybeOne, query } from "@shared/server/db/postgres";
import { jsonResponse } from "@shared/server/middleware/http";

export default defineHandler(async () => {
  assertProductionSecrets();
  const txline = await txlineClient.healthCheck();
  const database = hasDatabase();
  let fixtureStats: {
    total: number;
    live: number;
    inProgress: number;
    lastSyncAt: string | null;
  } = { total: 0, live: 0, inProgress: 0, lastSyncAt: null };

  if (database) {
    try {
      const [totalRows, liveRows, inProgressRows, lastSync] = await Promise.all([
        query<{ count: string }>("select count(*)::text as count from matches"),
        query<{ count: string }>("select count(*)::text as count from matches where status in ('live', 'halftime')"),
        query<{ count: string }>(
          "select count(*)::text as count from matches where status = 'scheduled' and kickoff_at is not null and kickoff_at <= now()",
        ),
        maybeOne<{ last_sync_at: string | null }>("select max(updated_at) as last_sync_at from matches"),
      ]);
      fixtureStats = {
        total: Number(totalRows[0]?.count ?? 0),
        live: Number(liveRows[0]?.count ?? 0),
        inProgress: Number(inProgressRows[0]?.count ?? 0),
        lastSyncAt: lastSync?.last_sync_at ?? null,
      };
    } catch {
      // Postgres URL set but DB unreachable — report degraded, don't 500
    }
  }

  const fixturesSynced = fixtureStats.total > 0 && Boolean(fixtureStats.lastSyncAt);
  const sseActive = Boolean(txline.lastSseAt);
  const sseAgeMs = txline.lastSseAt ? Date.now() - new Date(txline.lastSseAt).getTime() : null;
  const workerHealthy = sseActive && (sseAgeMs === null || sseAgeMs < 120_000);

  return jsonResponse({
    status: txline.status === "healthy" && database ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database,
    databaseReachable: database ? fixtureStats.lastSyncAt !== null || fixtureStats.total > 0 : false,
    solana: {
      network: process.env.SOLANA_NETWORK ?? "devnet",
      programDeployed: Boolean(process.env.WORLDCUP_PROGRAM_ID && process.env.WORLDCUP_PROGRAM_ID !== "Wcup111111111111111111111111111111111111111"),
      programId: process.env.WORLDCUP_PROGRAM_ID || null,
    },
    txline,
    worker: {
      process: "worldcup-worker",
      sseActive,
      lastSseAt: txline.lastSseAt,
      healthy: workerHealthy,
      hint: workerHealthy
        ? "TxLINE SSE worker is streaming live events"
        : "Shared worker on wmos server — pm2 restart worldcup-worker",
    },
    uptime: txline.lastSseAt ? "active" : fixturesSynced ? "synced" : "idle",
    fixtures: fixtureStats,
    webacyConfigured: hasWebacy(),
  });
});
