import { hasDatabase } from "../config/env";
import { query } from "../db/postgres";
import { syncFixturesFromTxline, closeExpiredMarkets, processScoreUpdate, processOddsUpdate, reconcilePostKickoffFixtures, syncScoresSnapshotsFromTxline, dedupeGoalBroadcasts, backfillMissingMarkets } from "../services/market-engine";
import { processSettlementJob } from "../services/settlement";
import { getAnalyticsSnapshot } from "../services/analytics";
import { listPredictionsForWallet } from "../repositories/matches";
import { txlineClient } from "../services/txline/client";

export async function runWorkerTick() {
  const results: Record<string, unknown> = {};

  if (!hasDatabase()) {
    return { ok: true, mode: "mock", results };
  }

  // Process pending jobs
  const jobs = await query<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
    attempts: number;
  }>(
    `
      select id, type, payload, attempts
      from worker_jobs
      where status = 'pending'
        and scheduled_at <= $1
      order by created_at asc
      limit 10
    `,
    [new Date().toISOString()],
  );

  for (const job of jobs) {
    await query(
      "update worker_jobs set status = 'running', started_at = $2, attempts = $3, updated_at = now() where id = $1",
      [job.id, new Date().toISOString(), job.attempts + 1],
    );
    try {
      switch (job.type) {
        case "settlement": {
          const payload = job.payload as { matchExternalId: string; fixtureId: number };
          const settlementResult = await processSettlementJob(payload.matchExternalId, payload.fixtureId);
          results.settlement = settlementResult;
          if (!settlementResult.ok) {
            throw new Error(String(settlementResult.reason ?? "settlement_failed"));
          }
          break;
        }
        case "market_engine": {
          results.marketEngine = await closeExpiredMarkets();
          break;
        }
        case "leaderboard_refresh": {
          results.leaderboard = await refreshLeaderboard();
          break;
        }
        case "statistics_refresh": {
          results.statistics = await refreshStatistics();
          break;
        }
        default:
          results[job.type] = "skipped";
      }
      await query("update worker_jobs set status = 'completed', finished_at = $2, updated_at = now() where id = $1", [
        job.id,
        new Date().toISOString(),
      ]);
    } catch (err) {
      await query(
        "update worker_jobs set status = 'failed', last_error = $2, finished_at = $3, updated_at = now() where id = $1",
        [job.id, err instanceof Error ? err.message : String(err), new Date().toISOString()],
      );
    }
  }

  results.fixturesSynced = await syncFixturesFromTxline();
  results.marketsBackfilled = await backfillMissingMarkets();
  results.marketsClosed = await closeExpiredMarkets();
  results.postKickoff = await reconcilePostKickoffFixtures();
  results.scoreSnapshots = await syncScoresSnapshotsFromTxline();
  results.goalDeduped = await dedupeGoalBroadcasts();

  try {
    const { syncEngagementPolls } = await import("../services/engagement-polls");
    results.engagementPollsResolved = await syncEngagementPolls();
  } catch (err) {
    console.error("engagement poll sync:", err);
  }

  try {
    const { syncLiveMarketsForAllInPlay } = await import("../services/live-markets");
    results.liveMarketsCreated = await syncLiveMarketsForAllInPlay();
  } catch (err) {
    console.error("live markets sync:", err);
  }

  try {
    const { settleLiveWindowMarkets } = await import("../services/settlement-live");
    results.liveMarketsSettled = await settleLiveWindowMarkets();
  } catch (err) {
    console.error("live markets settle:", err);
  }

  return { ok: true, results };
}

async function refreshLeaderboard() {
  const users = await query<{ id: string; wallet_pubkey: string; avatar: string | null }>(
    "select id, wallet_pubkey, avatar from users",
  );
  if (!users.length) return 0;

  const rankings: { userId: string; profit: number; volume: number; wins: number; total: number; streak: number; biggestWin: number }[] = [];

  for (const user of users) {
    const preds = await listPredictionsForWallet(user.wallet_pubkey);
    const volume = preds.reduce((s, p) => s + p.amount, 0);
    const wins = preds.filter((p) => p.status === "won" || p.status === "settled").length;
    const total = preds.filter((p) => p.status !== "open").length;
    const profit = preds.reduce((s, p) => s + ((p.payout ?? 0) - p.amount), 0);
    const biggestWin = Math.max(0, ...preds.map((p) => (p.payout ?? 0) - p.amount));
    rankings.push({ userId: user.id, profit, volume, wins, total, streak: wins > 0 ? 1 : 0, biggestWin });
  }

  rankings.sort((a, b) => b.profit - a.profit);

  for (const period of ["weekly", "monthly", "all_time"] as const) {
    for (let i = 0; i < rankings.length; i++) {
      const r = rankings[i];
      await query(
        `
          insert into leaderboard (user_id, period, rank, profit, roi, win_rate, correct, streak, volume, biggest_win)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          on conflict (user_id, period)
          do update set
            rank = excluded.rank,
            profit = excluded.profit,
            roi = excluded.roi,
            win_rate = excluded.win_rate,
            correct = excluded.correct,
            streak = excluded.streak,
            volume = excluded.volume,
            biggest_win = excluded.biggest_win,
            updated_at = now()
        `,
        [r.userId, period, i + 1, r.profit, r.volume ? (r.profit / r.volume) * 100 : 0, r.total ? (r.wins / r.total) * 100 : 0, r.wins, r.streak, r.volume, r.biggestWin],
      );
    }
  }

  return rankings.length;
}

async function refreshStatistics() {
  const analytics = await getAnalyticsSnapshot();
  const buckets = [
    { scope: "platform", bucket: "volume", metrics: analytics.volume },
    { scope: "platform", bucket: "users", metrics: analytics.users },
    { scope: "platform", bucket: "liquidity", metrics: analytics.liquidity },
    { scope: "platform", bucket: "settlements", metrics: analytics.settlements },
    { scope: "platform", bucket: "totals", metrics: { ...analytics.totals, oddsMove: analytics.oddsMove } },
  ];
  for (const b of buckets) {
    await query(
      `
        insert into statistics (scope, bucket, metrics)
        values ($1, $2, $3)
        on conflict (scope, bucket)
        do update set metrics = excluded.metrics, updated_at = now()
      `,
      [b.scope, b.bucket, b.metrics],
    );
  }
  return buckets.length;
}

let listenerRunning = false;

export async function startTxlineListener() {
  if (listenerRunning) return;
  listenerRunning = true;

  const runStream = async (type: "scores" | "odds") => {
    while (listenerRunning) {
      try {
        if (type === "scores") {
          await txlineClient.streamScores(async (payload) => {
            await processScoreUpdate(payload as Record<string, unknown>);
          });
        } else {
          await txlineClient.streamOdds(async (payload) => {
            await processOddsUpdate(payload as Record<string, unknown>);
          });
        }
      } catch (err) {
        console.error(`TxLINE ${type} stream error:`, err);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  };

  void runStream("scores");
  void runStream("odds");
}

export function stopTxlineListener() {
  listenerRunning = false;
}
