import { hasDatabase } from "../config/env";
import { query } from "../db/postgres";
import type { AnalyticsSnapshot } from "@/lib/types";

const EMPTY_ANALYTICS: AnalyticsSnapshot = {
  volume: [],
  users: [],
  liquidity: [],
  settlements: [],
  oddsMove: [],
  totals: { tvl: 0, volumeToday: 0, predictions: 0, markets: 0, liveMatches: 0, users: 0, transactions: 0 },
};

function formatDay(iso: string): string {
  return iso.slice(0, 10);
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  if (!hasDatabase()) return EMPTY_ANALYTICS;

  const [
    volumeRows,
    userRows,
    liquidityRow,
    settlementRows,
    marketCountRow,
    liveCountRow,
    userCountRow,
    txCountRow,
    tvlRow,
    volumeTodayRow,
    predictionsCountRow,
  ] = await Promise.all([
    query<{ day: string; volume: string }>(
      `
        select to_char(date_trunc('day', placed_at), 'YYYY-MM-DD') as day,
               coalesce(sum(amount), 0)::text as volume
        from predictions
        where placed_at >= now() - interval '14 days'
        group by 1
        order by 1 asc
      `,
    ),
    query<{ day: string; users: string }>(
      `
        select to_char(date_trunc('day', joined_at), 'YYYY-MM-DD') as day,
               count(*)::text as users
        from users
        where joined_at >= now() - interval '14 days'
        group by 1
        order by 1 asc
      `,
    ),
    query<{ liquidity: string }>(
      "select coalesce(sum(amount), 0)::text as liquidity from escrows where status = 'locked'",
    ),
    query<{ day: string; settlements: string }>(
      `
        select to_char(date_trunc('day', validated_at), 'YYYY-MM-DD') as day,
               count(*)::text as settlements
        from proofs
        where validation_status = 'verified' and validated_at >= now() - interval '14 days'
        group by 1
        order by 1 asc
      `,
    ),
    query<{ count: string }>("select count(*)::text as count from markets"),
    query<{ count: string }>("select count(*)::text as count from matches where status in ('live', 'halftime')"),
    query<{ count: string }>("select count(*)::text as count from users"),
    query<{ count: string }>("select count(*)::text as count from transactions"),
    query<{ tvl: string }>("select coalesce(sum(amount), 0)::text as tvl from predictions"),
    query<{ volume: string }>(
      "select coalesce(sum(amount), 0)::text as volume from predictions where placed_at::date = current_date",
    ),
    query<{ count: string }>("select count(*)::text as count from predictions"),
  ]);

  const volume = volumeRows.map((r) => ({ date: formatDay(r.day), value: Number(r.volume) }));
  const users = userRows.map((r) => ({ date: formatDay(r.day), value: Number(r.users) }));
  const liquidityLocked = Number(liquidityRow[0]?.liquidity ?? 0);
  const liquidity = liquidityLocked > 0
    ? volumeRows.map((r) => ({ date: formatDay(r.day), value: liquidityLocked }))
    : [];
  const settlements = settlementRows.map((r) => ({ date: formatDay(r.day), value: Number(r.settlements) }));

  const tvl = Number(tvlRow[0]?.tvl ?? 0);
  const volumeToday = Number(volumeTodayRow[0]?.volume ?? 0);
  const predictions = Number(predictionsCountRow[0]?.count ?? 0);

  return {
    volume,
    users,
    liquidity,
    settlements,
    oddsMove: [],
    totals: {
      tvl,
      volumeToday,
      predictions,
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
