import { hasDatabase, useMockFallback } from "../config/env";
import { query } from "../db/postgres";
import type { AnalyticsSnapshot } from "@/lib/types";

const EMPTY_ANALYTICS: AnalyticsSnapshot = {
  volume: [],
  users: [],
  liquidity: [],
  settlements: [],
  oddsMove: [],
  totals: { tvl: 0, markets: 0, liveMatches: 0, users: 0, transactions: 0 },
};

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  if (useMockFallback()) {
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(5, 10);
    });
    return {
      volume: days.map((date, i) => ({ date, value: 120_000 + i * 5_000 })),
      users: days.map((date, i) => ({ date, value: 800 + i * 10 })),
      liquidity: days.map((date, i) => ({ date, value: 2_000_000 + i * 20_000 })),
      settlements: days.map((date, i) => ({ date, value: 12 + (i % 5) })),
      oddsMove: Array.from({ length: 30 }).map((_, i) => ({
        t: Date.now() - (30 - i) * 60_000,
        home: 1.8 + Math.sin(i / 4) * 0.2,
        draw: 3.2 + Math.cos(i / 5) * 0.1,
        away: 2.5 + Math.sin(i / 3) * 0.15,
      })),
      totals: {
        tvl: 4_280_000,
        markets: 128,
        liveMatches: 0,
        users: 12_842,
        transactions: 48_291,
      },
    };
  }

  if (!hasDatabase()) return EMPTY_ANALYTICS;

  const stats = await query<{ scope: string; bucket: string; metrics: Record<string, unknown> }>("select scope, bucket, metrics from statistics");
  const volume = stats.find((s) => s.scope === "platform" && s.bucket === "volume");
  const users = stats.find((s) => s.scope === "platform" && s.bucket === "users");
  const liquidity = stats.find((s) => s.scope === "platform" && s.bucket === "liquidity");
  const settlements = stats.find((s) => s.scope === "platform" && s.bucket === "settlements");
  const totals = stats.find((s) => s.scope === "platform" && s.bucket === "totals");

  const [marketCountRow, liveCountRow, userCountRow, txCountRow] = await Promise.all([
    query<{ count: string }>("select count(*)::text as count from markets"),
    query<{ count: string }>("select count(*)::text as count from matches where status in ('live', 'halftime')"),
    query<{ count: string }>("select count(*)::text as count from users"),
    query<{ count: string }>("select count(*)::text as count from transactions"),
  ]);

  return {
    volume: (volume?.metrics as { date: string; value: number }[]) ?? [],
    users: (users?.metrics as { date: string; value: number }[]) ?? [],
    liquidity: (liquidity?.metrics as { date: string; value: number }[]) ?? [],
    settlements: (settlements?.metrics as { date: string; value: number }[]) ?? [],
    oddsMove: (totals?.metrics as { oddsMove?: AnalyticsSnapshot["oddsMove"] })?.oddsMove ?? [],
    totals: {
      tvl: Number((totals?.metrics as { tvl?: number })?.tvl ?? 0),
      markets: Number(marketCountRow[0]?.count ?? 0),
      liveMatches: Number(liveCountRow[0]?.count ?? 0),
      users: Number(userCountRow[0]?.count ?? 0),
      transactions: Number(txCountRow[0]?.count ?? 0),
    },
  };
}

export async function getPlatformStats() {
  const analytics = await getAnalyticsSnapshot();
  return analytics.totals;
}
