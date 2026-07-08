import { defineHandler } from "nitro";
import { hasDatabase } from "@/server/config/env";
import { query } from "@/server/db/postgres";
import { txlineClient } from "@/server/services/txline/client";
import { errorResponse, jsonResponse, rateLimit, requireSession, requireAdmin } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "admin"))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;
  if (!requireAdmin(wallet)) return errorResponse("Forbidden", 403);

  const txline = await txlineClient.healthCheck();

  if (!hasDatabase()) {
    return jsonResponse({
      users: 0,
      matches: 0,
      markets: 0,
      settlements: 0,
      proofs: 0,
      transactions: 0,
      txlineStatus: txline.status,
      workerStatus: {},
      recentJobs: [],
    });
  }

  const [
    usersRows,
    matchesRows,
    marketsRows,
    settlementsRows,
    proofsRows,
    transactionsRows,
    recentJobs,
    workerRuns,
  ] = await Promise.all([
    query<{ count: string }>("select count(*)::text as count from users"),
    query<{ count: string }>("select count(*)::text as count from matches"),
    query<{ count: string }>("select count(*)::text as count from markets"),
    query<{ count: string }>("select count(*)::text as count from settlements"),
    query<{ count: string }>("select count(*)::text as count from proofs"),
    query<{ count: string }>("select count(*)::text as count from transactions"),
    query<{ id: string; type: string; status: string; last_error: string | null; created_at: string }>(
      "select id, type, status, last_error, created_at from worker_jobs order by created_at desc limit 20",
    ),
    query<{ type: string; status: string; finished_at: string | null }>(
      "select type, status, finished_at from worker_jobs order by finished_at desc nulls last limit 50",
    ),
  ]);

  const workerStatus: Record<string, { status: string; lastRun: string | null }> = {};
  for (const run of workerRuns) {
    if (!workerStatus[run.type]) {
      workerStatus[run.type] = { status: run.status, lastRun: run.finished_at };
    }
  }

  return jsonResponse({
    users: Number(usersRows[0]?.count ?? 0),
    matches: Number(matchesRows[0]?.count ?? 0),
    markets: Number(marketsRows[0]?.count ?? 0),
    settlements: Number(settlementsRows[0]?.count ?? 0),
    proofs: Number(proofsRows[0]?.count ?? 0),
    transactions: Number(transactionsRows[0]?.count ?? 0),
    txlineStatus: txline.status,
    workerStatus,
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      lastError: j.last_error,
      createdAt: j.created_at,
    })),
  });
});
