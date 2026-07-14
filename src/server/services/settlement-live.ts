import { hasDatabase } from "../config/env";
import { maybeOne, query } from "../db/postgres";
import { insertLiveEvent } from "../repositories/matches";
import { LIVE_MARKET_TEMPLATES, syncLiveMarketsForMatch } from "./live-markets";

function templateForKind(kind: string) {
  return LIVE_MARKET_TEMPLATES.find((t) => t.resolutionKind === kind);
}

async function resolveLiveMarket(
  market: {
    id: string;
    external_id: string;
    match_id: string;
    match_external_id: string;
    resolution_kind: string | null;
    window_opens_at: string | null;
    closes_at: string | null;
  },
  eventOccurred: boolean,
): Promise<void> {
  const winningLabel = eventOccurred ? "Yes" : "No";
  await query("update markets set closed = true, resolved_outcome = $2, updated_at = now() where id = $1", [
    market.id,
    winningLabel.toLowerCase(),
  ]);

  const options = await query<{ id: string; label: string }>(
    "select id, label from market_options where market_id = $1",
    [market.id],
  );
  const winningOption = options.find((o) => o.label.toLowerCase() === winningLabel.toLowerCase());
  const winningOptionIds = new Set(winningOption ? [winningOption.id] : []);

  const predictions = await query<{
    id: string;
    user_id: string | null;
    option_id: string;
    amount: string | number;
    price: string | number;
    outcome_label: string;
    external_id: string;
  }>("select * from predictions where market_id = $1 and status = 'open'", [market.id]);

  for (const pred of predictions) {
    const won = winningOptionIds.has(pred.option_id);
    const payout = won ? Number(pred.amount) * Number(pred.price) : 0;
    await query("update predictions set status = $1, payout = $2, updated_at = now() where id = $3", [
      won ? "won" : "lost",
      payout,
      pred.id,
    ]);
    if (won) {
      await query(
        "update escrows set status = 'released', released_at = now(), updated_at = now() where prediction_id = $1",
        [pred.id],
      );
    }
    if (pred.user_id) {
      await query(
        "insert into notifications (user_id, type, title, body, payload) values ($1, $2, $3, $4, $5)",
        [
          pred.user_id,
          won ? "prediction_won" : "prediction_lost",
          won ? "Live prediction won" : "Live prediction lost",
          `${pred.outcome_label} · ${won ? `+${payout.toFixed(2)} USDC` : "Window closed"}`,
          { predictionId: pred.external_id, payout, marketId: market.external_id },
        ],
      );
    }
  }

  await insertLiveEvent(
    market.match_external_id,
    "market_settled",
    "Live window settled",
    `${market.external_id} → ${winningLabel}`,
    { marketId: market.external_id, outcome: winningLabel.toLowerCase() },
  );

  await syncLiveMarketsForMatch(market.match_id, market.match_external_id, "live");
}

async function eventInWindow(
  matchId: string,
  eventTypes: string[],
  windowOpensAt: string | null,
  closesAt: string | null,
): Promise<boolean> {
  if (!windowOpensAt || !closesAt) return false;
  const row = await maybeOne<{ count: string }>(
    `
      select count(*)::text as count
      from match_events
      where match_id = $1
        and type = any($2::text[])
        and created_at >= $3::timestamptz
        and created_at <= $4::timestamptz
    `,
    [matchId, eventTypes, windowOpensAt, closesAt],
  );
  return Number(row?.count ?? 0) > 0;
}

/** Settle expired live window markets from match_events. */
export async function settleLiveWindowMarkets(): Promise<number> {
  if (!hasDatabase()) return 0;

  const markets = await query<{
    id: string;
    external_id: string;
    match_id: string;
    match_external_id: string;
    resolution_kind: string | null;
    window_opens_at: string | null;
    closes_at: string | null;
  }>(
    `
      select m.id, m.external_id, m.match_id, mt.external_id as match_external_id,
             m.resolution_kind, m.window_opens_at, m.closes_at
      from markets m
      join matches mt on mt.id = m.match_id
      where m.type like 'live_%'
        and m.resolved_outcome is null
        and m.closes_at is not null
        and m.closes_at <= now()
    `,
  );

  let settled = 0;
  for (const market of markets) {
    const template = templateForKind(String(market.resolution_kind ?? ""));
    const eventTypes = template?.eventTypes ?? ["goal"];
    const occurred = await eventInWindow(
      market.match_id,
      eventTypes,
      market.window_opens_at,
      market.closes_at,
    );
    await resolveLiveMarket(market, occurred);
    settled += 1;
  }
  return settled;
}

/** Early-settle open live markets when a matching event arrives mid-window. */
export async function settleLiveMarketsOnEvent(matchId: string, eventType: string): Promise<number> {
  if (!hasDatabase()) return 0;
  const normalized = eventType.toLowerCase();
  const markets = await query<{
    id: string;
    external_id: string;
    match_id: string;
    match_external_id: string;
    resolution_kind: string | null;
    window_opens_at: string | null;
    closes_at: string | null;
  }>(
    `
      select m.id, m.external_id, m.match_id, mt.external_id as match_external_id,
             m.resolution_kind, m.window_opens_at, m.closes_at
      from markets m
      join matches mt on mt.id = m.match_id
      where m.match_id = $1
        and m.type like 'live_%'
        and m.resolved_outcome is null
        and m.closed = false
        and m.closes_at > now()
    `,
    [matchId],
  );

  let settled = 0;
  for (const market of markets) {
    const template = templateForKind(String(market.resolution_kind ?? ""));
    if (!template?.eventTypes.includes(normalized)) continue;
    const inWindow = await eventInWindow(
      market.match_id,
      template.eventTypes,
      market.window_opens_at,
      market.closes_at,
    );
    if (!inWindow) continue;
    await resolveLiveMarket(market, true);
    settled += 1;
  }
  return settled;
}
