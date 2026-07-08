import { hasDatabase } from "../config/env";
import { maybeOne, one, query } from "../db/postgres";
import { buildMarketsForMatch } from "@/lib/mock/data";
import type { Match } from "@/lib/mock/types";
import { fixtureToMatchRow, mapGameStateToStatus, mapScoreEventType } from "./txline/adapters";
import { txlineClient } from "./txline/client";
import { insertLiveEvent, enqueueJob } from "../repositories/matches";

export async function syncFixturesFromTxline(): Promise<number> {
  if (!hasDatabase()) return 0;
  const fixtures = await txlineClient.getFixturesSnapshot();
  if (!fixtures.length) return 0;

  let count = 0;
  for (const fixture of fixtures as Record<string, unknown>[]) {
    const row = fixtureToMatchRow(fixture);
    const existing = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [row.external_id]);
    const upserted = await one<{ id: string; external_id: string }>(
      `
        insert into matches (
          external_id, txline_fixture_id, home_team, away_team, score_home, score_away,
          status, minute, stadium, stage, kickoff_at, stats, odds, odds_history, raw_payload
        ) values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        on conflict (external_id)
        do update set
          txline_fixture_id = excluded.txline_fixture_id,
          home_team = excluded.home_team,
          away_team = excluded.away_team,
          score_home = excluded.score_home,
          score_away = excluded.score_away,
          status = excluded.status,
          minute = excluded.minute,
          stadium = excluded.stadium,
          stage = excluded.stage,
          kickoff_at = excluded.kickoff_at,
          stats = excluded.stats,
          odds = excluded.odds,
          odds_history = excluded.odds_history,
          raw_payload = excluded.raw_payload,
          updated_at = now()
        returning id, external_id
      `,
      [
        row.external_id,
        row.txline_fixture_id,
        row.home_team,
        row.away_team,
        row.score_home,
        row.score_away,
        row.status,
        row.minute,
        row.stadium,
        row.stage,
        row.kickoff_at,
        row.stats,
        row.odds,
        row.odds_history,
        row.raw_payload,
      ],
    );
    count += 1;

    if (!existing) {
      await createMarketsForMatch(upserted.external_id, upserted.id);
      await enqueueJob("market_engine", { matchExternalId: upserted.external_id });
    }
  }
  return count;
}

export async function createMarketsForMatch(matchExternalId: string, matchUuid?: string) {
  if (!hasDatabase()) return;
  let matchId = matchUuid;
  if (!matchId) {
    const data = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchExternalId]);
    if (!data) return;
    matchId = data.id;
  }

  const matchRow = await maybeOne<Record<string, unknown>>("select * from matches where id = $1", [matchId]);
  if (!matchRow) return;

  const pseudoMatch: Match = {
    id: matchRow.external_id,
    home: matchRow.home_team,
    away: matchRow.away_team,
    scoreHome: matchRow.score_home,
    scoreAway: matchRow.score_away,
    status: matchRow.status,
    minute: matchRow.minute,
    stadium: matchRow.stadium ?? "",
    stage: matchRow.stage ?? "",
    kickoff: matchRow.kickoff_at ? new Date(matchRow.kickoff_at).getTime() : Date.now(),
    events: [],
    stats: matchRow.stats,
    odds: matchRow.odds,
    oddsHistory: matchRow.odds_history ?? [],
  };

  const markets = buildMarketsForMatch(pseudoMatch);
  const closesAt = matchRow.kickoff_at
    ? new Date(new Date(matchRow.kickoff_at).getTime() - 5 * 60_000).toISOString()
    : null;

  for (const market of markets) {
    const mkt = await one<{ id: string }>(
      `
        insert into markets (external_id, match_id, type, title, closes_at, closed, total_liquidity)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (external_id)
        do update set
          match_id = excluded.match_id,
          type = excluded.type,
          title = excluded.title,
          closes_at = excluded.closes_at,
          closed = excluded.closed,
          total_liquidity = excluded.total_liquidity,
          updated_at = now()
        returning id
      `,
      [market.id, matchId, market.type, market.title, closesAt, market.closed, market.totalLiquidity],
    );
    if (!mkt) continue;
    for (const outcome of market.outcomes) {
      await query(
        `
          insert into market_options (external_id, market_id, label, price, liquidity, participants)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (market_id, external_id)
          do update set
            label = excluded.label,
            price = excluded.price,
            liquidity = excluded.liquidity,
            participants = excluded.participants,
            updated_at = now()
        `,
        [outcome.id, mkt.id, outcome.label, outcome.price, outcome.liquidity, outcome.participants],
      );
    }
  }
}

export async function closeExpiredMarkets(): Promise<number> {
  if (!hasDatabase()) return 0;
  const now = new Date().toISOString();
  const markets = await query<{ id: string; external_id: string; match_external_id: string }>(
    `
      select m.id, m.external_id, mt.external_id as match_external_id
      from markets m
      join matches mt on mt.id = m.match_id
      where m.closed = false and m.closes_at <= $1
    `,
    [now],
  );
  if (!markets?.length) return 0;

  for (const market of markets) {
    await query("update markets set closed = true, updated_at = now() where id = $1", [market.id]);
    await insertLiveEvent(market.match_external_id, "market_closing", "Market closed", `${market.external_id} locked before kickoff`, {
      marketId: market.external_id,
    });
  }
  return markets.length;
}

export async function processScoreUpdate(payload: Record<string, unknown>) {
  if (!hasDatabase()) return;
  const fixtureId = Number(payload.fixtureId ?? payload.fixture_id ?? 0);
  if (!fixtureId) return;

  const match = await maybeOne<Record<string, unknown>>("select * from matches where txline_fixture_id = $1", [fixtureId]);
  if (!match) return;

  const gameState = Number(payload.gameState ?? payload.game_state ?? 1);
  const status = mapGameStateToStatus(gameState, String(payload.status ?? ""));
  const scoreHome = Number((payload.score as Record<string, number>)?.home ?? payload.scoreHome ?? match.score_home);
  const scoreAway = Number((payload.score as Record<string, number>)?.away ?? payload.scoreAway ?? match.score_away);
  const minute = Number(payload.minute ?? payload.clock ?? match.minute);

  await query(
    "update matches set score_home = $1, score_away = $2, status = $3, minute = $4, raw_payload = $5, updated_at = now() where id = $6",
    [scoreHome, scoreAway, status, minute, payload, match.id],
  );

  const eventType = String(payload.eventType ?? payload.type ?? "");
  if (eventType) {
    const mapped = mapScoreEventType(eventType);
    await query(
      `
        insert into match_events (match_id, external_id, txline_seq, minute, type, team_id, player, detail, payload)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        match.id,
        String(payload.seq ?? payload.id ?? `${Date.now()}`),
        Number(payload.seq ?? 0) || null,
        minute,
        mapped,
        String(payload.teamId ?? payload.team_id ?? ""),
        payload.player ? String(payload.player) : null,
        payload.detail ? String(payload.detail) : null,
        payload,
      ],
    );

    if (mapped === "goal") {
      await insertLiveEvent(
        match.external_id,
        "goal",
        "Goal",
        `${payload.player ?? "Player"} · ${minute}'`,
        payload,
      );
    }
  }

  if (status === "finished") {
    await enqueueJob("settlement", { matchExternalId: match.external_id, fixtureId });
    await insertLiveEvent(match.external_id, "settlement_started", "Settlement started", "TxLINE final state received", {
      fixtureId,
    });
  }
}

export async function processOddsUpdate(payload: Record<string, unknown>) {
  if (!hasDatabase()) return;
  const fixtureId = Number(payload.fixtureId ?? payload.fixture_id ?? 0);
  if (!fixtureId) return;

  const match = await maybeOne<Record<string, unknown>>("select * from matches where txline_fixture_id = $1", [fixtureId]);
  if (!match) return;

  const home = Number(payload.home ?? payload.homeOdds ?? match.odds?.home ?? 2);
  const draw = Number(payload.draw ?? payload.drawOdds ?? match.odds?.draw ?? 3);
  const away = Number(payload.away ?? payload.awayOdds ?? match.odds?.away ?? 2.5);
  const odds = { home, draw, away, updatedAt: Date.now() };
  const history = [...(match.odds_history ?? []).slice(-29), { t: Date.now(), home, draw, away }];

  await query("update matches set odds = $1, odds_history = $2, updated_at = now() where id = $3", [odds, history, match.id]);
  await insertLiveEvent(match.external_id, "odds_update", "Odds update", `H ${home} · D ${draw} · A ${away}`, payload);
}
