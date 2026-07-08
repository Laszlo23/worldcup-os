import { hasDatabase, useMockFallback, LiveDataRequiredError } from "../config/env";
import { maybeOne, query } from "../db/postgres";
import type { Match, Market, Prediction, TxLineProof, LeaderRow } from "@/lib/mock/types";
import { dbRowToMatch, type DbMatchRow } from "../services/txline/adapters";
import { initialMatches, buildMarketsForMatch, leaderboard as mockLeaderboard, proofs as mockProofs } from "@/lib/mock/data";

function shouldUseMock(): boolean {
  return useMockFallback();
}

function requireLiveOrThrow(): void {
  if (!shouldUseMock() && !hasDatabase()) {
    throw new LiveDataRequiredError();
  }
}

export async function listMatches(): Promise<Match[]> {
  if (shouldUseMock()) return initialMatches;
  requireLiveOrThrow();

  const rows = await query<DbMatchRow>("select * from matches order by kickoff_at asc nulls last, created_at asc");
  if (!rows.length) return [];

  const matchIds = rows.map((r) => r.id);
  const events = await query<{
    id: string;
    match_id: string;
    external_id: string | null;
    minute: number;
    type: string;
    team_id: string | null;
    player: string | null;
    detail: string | null;
  }>(
    `
      select id, match_id, external_id, minute, type, team_id, player, detail
      from match_events
      where match_id = any($1::uuid[])
      order by minute desc, created_at desc
    `,
    [matchIds],
  );

  return rows.map((row) => {
    const evs = events
      .filter((e) => e.match_id === row.id)
      .map((e) => ({
        id: e.external_id ?? e.id,
        minute: e.minute,
        type: e.type,
        teamId: e.team_id ?? "",
        player: e.player ?? undefined,
        detail: e.detail ?? undefined,
      }));
    return dbRowToMatch(row as DbMatchRow, evs);
  });
}

export async function getMatchByExternalId(externalId: string): Promise<Match | null> {
  const matches = await listMatches();
  return matches.find((m) => m.id === externalId) ?? null;
}

export async function listMarkets(matchExternalId?: string): Promise<Market[]> {
  if (shouldUseMock()) {
    const matches = matchExternalId
      ? initialMatches.filter((m) => m.id === matchExternalId)
      : initialMatches.filter((m) => m.status !== "settled");
    return matches.flatMap(buildMarketsForMatch);
  }

  requireLiveOrThrow();
  const rows = await query<{
    market_id: string;
    market_external_id: string;
    match_external_id: string;
    type: Market["type"];
    title: string;
    closed: boolean;
    total_liquidity: string | number;
    option_id: string | null;
    option_external_id: string | null;
    label: string | null;
    price: string | number | null;
    liquidity: string | number | null;
    participants: number | null;
  }>(
    `
      select
        m.id as market_id,
        m.external_id as market_external_id,
        mt.external_id as match_external_id,
        m.type,
        m.title,
        m.closed,
        m.total_liquidity,
        o.id as option_id,
        o.external_id as option_external_id,
        o.label,
        o.price,
        o.liquidity,
        o.participants
      from markets m
      join matches mt on mt.id = m.match_id
      left join market_options o on o.market_id = m.id
      where m.closed = false
        and ($1::text is null or mt.external_id = $1)
      order by m.created_at asc, o.created_at asc
    `,
    [matchExternalId ?? null],
  );
  if (!rows.length) return [];

  const grouped = new Map<string, Market>();
  for (const row of rows) {
    const existing = grouped.get(row.market_id);
    if (!existing) {
      grouped.set(row.market_id, {
        id: row.market_external_id,
        matchId: row.match_external_id,
        type: row.type,
        title: row.title,
        closed: row.closed,
        totalLiquidity: Number(row.total_liquidity),
        outcomes: [],
      });
    }
    if (row.option_id) {
      grouped.get(row.market_id)!.outcomes.push({
        id: row.option_external_id ?? row.option_id,
        label: row.label ?? "",
        price: Number(row.price ?? 0),
        liquidity: Number(row.liquidity ?? 0),
        participants: Number(row.participants ?? 0),
      });
    }
  }

  return [...grouped.values()];
}

export async function listProofs(matchExternalId?: string): Promise<TxLineProof[]> {
  if (shouldUseMock()) return mockProofs;
  requireLiveOrThrow();

  const rows = await query<{
    match_external_id: string;
    final_score_home: number | null;
    final_score_away: number | null;
    merkle_root: string;
    proof_hash: string;
    signature: string;
    validated_at: string | null;
    solana_tx: string | null;
    validation_status: string;
  }>(
    `
      select
        m.external_id as match_external_id,
        p.final_score_home,
        p.final_score_away,
        p.merkle_root,
        p.proof_hash,
        p.signature,
        p.validated_at,
        p.solana_tx,
        p.validation_status
      from proofs p
      join matches m on m.id = p.match_id
      where ($1::text is null or m.external_id = $1)
      order by p.validated_at desc nulls last, p.created_at desc
    `,
    [matchExternalId ?? null],
  );
  if (!rows.length) return [];

  return rows.map((p) => ({
    matchId: p.match_external_id,
    finalScore: [p.final_score_home ?? 0, p.final_score_away ?? 0] as [number, number],
    merkleRoot: p.merkle_root,
    proofHash: p.proof_hash,
    signature: p.signature,
    validatedAt: p.validated_at ? new Date(p.validated_at).getTime() : Date.now(),
    solanaTx: p.solana_tx ?? "",
    status: (p.validation_status === "verified" ? "verified" : "pending") as "verified" | "pending",
  }));
}

export async function listLeaderboard(period = "all_time"): Promise<LeaderRow[]> {
  if (shouldUseMock()) return mockLeaderboard;
  requireLiveOrThrow();

  const rows = await query<{
    user_id: string;
    rank: number;
    wallet_pubkey: string;
    avatar: string | null;
    profit: string | number;
    win_rate: string | number;
    correct: number;
    streak: number;
    biggest_win: string | number;
  }>(
    `
      select l.user_id, l.rank, u.wallet_pubkey, u.avatar, l.profit, l.win_rate, l.correct, l.streak, l.biggest_win
      from leaderboard l
      join users u on u.id = l.user_id
      where l.period = $1
      order by l.rank asc
      limit 20
    `,
    [period],
  );
  if (!rows.length) return [];

  return rows.map((row) => ({
    rank: row.rank,
    address: `${row.wallet_pubkey.slice(0, 4)}...${row.wallet_pubkey.slice(-4)}`,
    avatar: row.avatar ?? `https://api.dicebear.com/9.x/shapes/svg?seed=${row.user_id}`,
    profit: Number(row.profit),
    winRate: Number(row.win_rate),
    correct: row.correct,
    streak: row.streak,
    biggestWin: Number(row.biggest_win),
  }));
}

export async function listPredictionsForWallet(pubkey: string): Promise<Prediction[]> {
  if (shouldUseMock()) return [];
  requireLiveOrThrow();

  const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [pubkey]);
  if (!user) return [];
  const rows = await query<{
    external_id: string;
    market_external_id: string;
    match_external_id: string;
    option_id: string;
    outcome_label: string;
    amount: string | number;
    price: string | number;
    placed_at: string;
    status: Prediction["status"];
    payout: string | number | null;
    claimed: boolean;
  }>(
    `
      select
        p.external_id,
        mk.external_id as market_external_id,
        mt.external_id as match_external_id,
        p.option_id,
        p.outcome_label,
        p.amount,
        p.price,
        p.placed_at,
        p.status,
        p.payout,
        p.claimed
      from predictions p
      join markets mk on mk.id = p.market_id
      join matches mt on mt.id = p.match_id
      where p.user_id = $1
      order by p.placed_at desc
    `,
    [user.id],
  );

  return rows.map((p) => ({
    id: p.external_id,
    marketId: p.market_external_id,
    matchId: p.match_external_id,
    outcomeId: p.option_id,
    outcomeLabel: p.outcome_label,
    amount: Number(p.amount),
    price: Number(p.price),
    placedAt: new Date(p.placed_at).getTime(),
    status: p.status,
    payout: p.payout ? Number(p.payout) : undefined,
    claimed: p.claimed,
  }));
}

export async function upsertUser(pubkey: string, nickname?: string, avatar?: string) {
  if (shouldUseMock()) return { id: pubkey, wallet_pubkey: pubkey };
  const data = await one<{ id: string; wallet_pubkey: string; nickname: string | null; avatar: string | null }>(
    `
      insert into users (wallet_pubkey, nickname, avatar, joined_at)
      values ($1, $2, $3, $4)
      on conflict (wallet_pubkey)
      do update set
        nickname = excluded.nickname,
        avatar = excluded.avatar,
        updated_at = now()
      returning id, wallet_pubkey, nickname, avatar
    `,
    [
      pubkey,
      nickname ?? `Trader ${pubkey.slice(0, 4)}`,
      avatar ?? `https://api.dicebear.com/9.x/shapes/svg?seed=${pubkey}`,
      new Date().toISOString(),
    ],
  );
  await query(
    `
      insert into wallets (user_id, pubkey, last_seen_at)
      values ($1, $2, $3)
      on conflict (user_id, pubkey)
      do update set last_seen_at = excluded.last_seen_at, updated_at = now()
    `,
    [data.id, pubkey, new Date().toISOString()],
  );
  return data;
}

export async function insertLiveEvent(matchId: string | null, eventType: string, title: string, body: string, payload: Record<string, unknown>) {
  if (shouldUseMock()) return;
  let matchUuid: string | null = null;
  if (matchId) {
    const data = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchId]);
    matchUuid = data?.id ?? null;
  }
  await query(
    "insert into live_events (match_id, event_type, title, body, payload) values ($1, $2, $3, $4, $5)",
    [matchUuid, eventType, title, body, payload],
  );
}

export async function enqueueJob(type: string, payload: Record<string, unknown>) {
  if (shouldUseMock()) return;
  await query("insert into worker_jobs (type, payload, status) values ($1, $2, 'pending')", [type, payload]);
}
