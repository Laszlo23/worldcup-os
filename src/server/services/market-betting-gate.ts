import { hasDatabase } from "@/server/config/env";
import { maybeOne } from "@/server/db/postgres";
import { isMarketBettable } from "@/server/services/live-markets";

export async function loadMarketBettingGate(marketExternalId: string): Promise<
  | { ok: true; market: { type: string; closed: boolean; closes_at: string | null; kickoff_at: string | null; match_status: string } }
  | { ok: false; reason: string }
> {
  if (!hasDatabase()) return { ok: false, reason: "Database unavailable" };

  const market = await maybeOne<{
    type: string;
    closed: boolean;
    closes_at: string | null;
    kickoff_at: string | null;
    match_status: string;
  }>(
    `
      select m.type, m.closed, m.closes_at, mt.kickoff_at, mt.status as match_status
      from markets m
      join matches mt on mt.id = m.match_id
      where m.external_id = $1
    `,
    [marketExternalId],
  );

  if (!market) return { ok: false, reason: "Market not found" };
  if (!isMarketBettable({
    marketType: market.type,
    matchStatus: market.match_status,
    closed: market.closed,
    closesAt: market.closes_at,
    kickoffAt: market.kickoff_at,
  })) {
    return { ok: false, reason: "Market closed for predictions" };
  }

  return { ok: true, market };
}
