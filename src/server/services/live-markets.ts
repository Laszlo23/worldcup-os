import { hasDatabase } from "../config/env";
import { maybeOne, one, query } from "../db/postgres";
import { insertLiveEvent } from "../repositories/matches";

const LIVE_WINDOW_MS = 7 * 60_000;
const MAX_OPEN_LIVE_MARKETS = 3;

export type LiveMarketTemplate = {
  type: string;
  title: string;
  resolutionKind: string;
  eventTypes: string[];
};

export const LIVE_MARKET_TEMPLATES: LiveMarketTemplate[] = [
  {
    type: "live_goal_7min",
    title: "Will there be a goal in the next 7 minutes?",
    resolutionKind: "goal",
    eventTypes: ["goal"],
  },
  {
    type: "live_penalty_7min",
    title: "Will there be a penalty in the next 7 minutes?",
    resolutionKind: "penalty",
    eventTypes: ["penalty"],
  },
  {
    type: "live_card_7min",
    title: "Will there be a card in the next 7 minutes?",
    resolutionKind: "card",
    eventTypes: ["yellow", "red"],
  },
];

function templateForSlot(index: number): LiveMarketTemplate {
  return LIVE_MARKET_TEMPLATES[index % LIVE_MARKET_TEMPLATES.length]!;
}

async function countOpenLiveMarkets(matchId: string): Promise<number> {
  const row = await maybeOne<{ count: string }>(
    `
      select count(*)::text as count
      from markets
      where match_id = $1
        and type like 'live_%'
        and closed = false
        and (closes_at is null or closes_at > now())
    `,
    [matchId],
  );
  return Number(row?.count ?? 0);
}

async function createLiveMarket(matchId: string, matchExternalId: string, slotIndex: number): Promise<string | null> {
  const template = templateForSlot(slotIndex);
  const now = Date.now();
  const externalId = `${template.type}_${matchExternalId}_${now}`;
  const opensAt = new Date(now).toISOString();
  const closesAt = new Date(now + LIVE_WINDOW_MS).toISOString();

  const mkt = await one<{ id: string }>(
    `
      insert into markets (
        external_id, match_id, type, title, closes_at, closed, total_liquidity,
        window_opens_at, resolution_kind
      ) values ($1, $2, $3, $4, $5, false, 0, $6, $7)
      returning id
    `,
    [externalId, matchId, template.type, template.title, closesAt, opensAt, template.resolutionKind],
  );

  for (const [label, price] of [
    ["Yes", 1.85],
    ["No", 1.85],
  ] as const) {
    await query(
      `
        insert into market_options (external_id, market_id, label, price, liquidity, participants)
        values ($1, $2, $3, $4, 0, 0)
        on conflict (market_id, external_id) do nothing
      `,
      [label.toLowerCase(), mkt.id, label, price],
    );
  }

  await insertLiveEvent(
    matchExternalId,
    "market_opening",
    "Live prediction open",
    template.title,
    { marketId: externalId, closesAt },
  );

  return externalId;
}

/** Keep up to 3 open live markets while match is in play. */
export async function syncLiveMarketsForMatch(matchId: string, matchExternalId: string, status: string): Promise<number> {
  if (!hasDatabase()) return 0;
  const normalized = status.toLowerCase();
  if (normalized !== "live" && normalized !== "halftime") return 0;

  let created = 0;
  let open = await countOpenLiveMarkets(matchId);
  let slot = await maybeOne<{ count: string }>(
    "select count(*)::text as count from markets where match_id = $1 and type like 'live_%'",
    [matchId],
  );
  let slotIndex = Number(slot?.count ?? 0);

  while (open < MAX_OPEN_LIVE_MARKETS) {
    const id = await createLiveMarket(matchId, matchExternalId, slotIndex);
    if (!id) break;
    created += 1;
    open += 1;
    slotIndex += 1;
  }

  return created;
}

export async function syncLiveMarketsForAllInPlay(): Promise<number> {
  if (!hasDatabase()) return 0;
  const rows = await query<{ id: string; external_id: string; status: string }>(
    "select id, external_id, status from matches where status in ('live', 'halftime')",
  );
  let total = 0;
  for (const row of rows) {
    total += await syncLiveMarketsForMatch(row.id, row.external_id, row.status);
  }
  return total;
}

export function isLiveMarketType(type: string): boolean {
  return type.startsWith("live_");
}

export function isLiveMarketBettable(params: {
  marketType: string;
  matchStatus: string;
  closed: boolean;
  closesAt: string | null;
}): boolean {
  if (!isLiveMarketType(params.marketType)) return false;
  if (params.closed) return false;
  const status = params.matchStatus.toLowerCase();
  if (status !== "live" && status !== "halftime") return false;
  if (params.closesAt && new Date(params.closesAt).getTime() <= Date.now()) return false;
  return true;
}

export function isPreMatchMarketBettable(params: {
  marketType: string;
  matchStatus: string;
  closed: boolean;
  kickoffAt: string | null;
}): boolean {
  if (isLiveMarketType(params.marketType)) return false;
  if (params.closed || params.matchStatus !== "scheduled") return false;
  if (params.kickoffAt) {
    const closesAt = new Date(params.kickoffAt).getTime() - 5 * 60_000;
    if (Date.now() >= closesAt) return false;
  }
  return true;
}

export function isMarketBettable(params: {
  marketType: string;
  matchStatus: string;
  closed: boolean;
  closesAt: string | null;
  kickoffAt: string | null;
}): boolean {
  if (isLiveMarketType(params.marketType)) {
    return isLiveMarketBettable({
      marketType: params.marketType,
      matchStatus: params.matchStatus,
      closed: params.closed,
      closesAt: params.closesAt,
    });
  }
  return isPreMatchMarketBettable({
    marketType: params.marketType,
    matchStatus: params.matchStatus,
    closed: params.closed,
    kickoffAt: params.kickoffAt,
  });
}
