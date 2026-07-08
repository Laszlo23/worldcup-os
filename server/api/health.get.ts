import { defineHandler } from "nitro";
import { txlineClient } from "@/server/services/txline/client";
import { assertProductionSecrets, hasDatabase } from "@/server/config/env";
import { maybeOne, query } from "@/server/db/postgres";

export default defineHandler(async () => {
  assertProductionSecrets();
  const txline = await txlineClient.healthCheck();
  const database = hasDatabase();
  let fixtureStats: {
    total: number;
    live: number;
    lastSyncAt: string | null;
  } = { total: 0, live: 0, lastSyncAt: null };

  if (database) {
    try {
      const [totalRows, liveRows, lastSync] = await Promise.all([
        query<{ count: string }>("select count(*)::text as count from matches"),
        query<{ count: string }>("select count(*)::text as count from matches where status in ('live', 'halftime')"),
        maybeOne<{ last_sync_at: string | null }>("select max(updated_at) as last_sync_at from matches"),
      ]);
      fixtureStats = {
        total: Number(totalRows[0]?.count ?? 0),
        live: Number(liveRows[0]?.count ?? 0),
        lastSyncAt: lastSync?.last_sync_at ?? null,
      };
    } catch {
      // Postgres URL set but DB unreachable — report degraded, don't 500
    }
  }

  return {
    status: txline.status === "healthy" && (!database || fixtureStats.total >= 0) ? (txline.status === "healthy" ? "ok" : "degraded") : "degraded",
    timestamp: new Date().toISOString(),
    database,
    databaseReachable: database ? fixtureStats.lastSyncAt !== null || fixtureStats.total > 0 : false,
    solana: {
      network: process.env.SOLANA_NETWORK ?? "devnet",
      programDeployed: Boolean(process.env.WORLDCUP_PROGRAM_ID && process.env.WORLDCUP_PROGRAM_ID !== "Wcup111111111111111111111111111111111111111"),
      programId: process.env.WORLDCUP_PROGRAM_ID || null,
    },
    txline,
    uptime: txline.lastSseAt ? "active" : "idle",
    fixtures: fixtureStats,
  };
});
