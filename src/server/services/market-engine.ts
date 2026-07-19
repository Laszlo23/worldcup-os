import { hasDatabase } from "../config/env";
import { maybeOne, one, query } from "../db/postgres";
import { buildMarketsForMatch } from "@/lib/mock/data";
import type { Match } from "@/lib/mock/types";
import { normalizeOdds, parseRealOdds, defaultOdds } from "@/lib/match-utils";
import { fixtureToMatchRow, mapGameStateToStatus, mapScoreEventType, mergeMatchStatus, pickLatestScoreSnapshot, scoreSnapshotToUpdate } from "./txline/adapters";
import { txlineClient } from "./txline/client";
import { insertLiveEvent, enqueueJob } from "../repositories/matches";
import { initializeMarketIfConfigured } from "../blockchain/market";

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
    await createMarketsForMatch(upserted.external_id, upserted.id);
    if (!existing) {
      await enqueueJob("market_engine", { matchExternalId: upserted.external_id });
    }
  }
  return count;
}

/** Ensure every scheduled fixture has DB markets (TxLINE sync can miss fixtures already in DB). */
export async function backfillMissingMarkets(matchExternalId?: string): Promise<number> {
  if (!hasDatabase()) return 0;

  const rows = await query<{ external_id: string; id: string }>(
    `
      select mt.external_id, mt.id
      from matches mt
      left join markets m on m.match_id = mt.id
      where mt.status = 'scheduled'
        and ($1::text is null or mt.external_id = $1)
      group by mt.external_id, mt.id
      having count(m.id) = 0
      order by mt.kickoff_at asc nulls last
    `,
    [matchExternalId ?? null],
  );

  for (const row of rows) {
    await createMarketsForMatch(row.external_id, row.id);
  }
  return rows.length;
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
    odds: parseRealOdds(matchRow.odds as Match["odds"]) ?? defaultOdds(),
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
    if (market.type === "winner" && !market.closed) {
      void initializeMarketIfConfigured({
        matchExternalId: matchExternalId,
        marketType: market.type,
        marketUuid: mkt.id,
      });
    }
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

export async function closeMarketsForMatch(matchExternalId: string): Promise<void> {
  if (!hasDatabase()) return;
  await query(
    `
      update markets m
      set closed = true, updated_at = now()
      from matches mt
      where m.match_id = mt.id
        and mt.external_id = $1
        and m.closed = false
        and m.type not like 'live_%'
    `,
    [matchExternalId],
  );
}

export async function closeExpiredMarkets(): Promise<number> {
  if (!hasDatabase()) return 0;
  const now = new Date().toISOString();
  const markets = await query<{ id: string; external_id: string; match_external_id: string }>(
    `
      select m.id, m.external_id, mt.external_id as match_external_id
      from markets m
      join matches mt on mt.id = m.match_id
      where m.closed = false and m.closes_at <= $1 and m.type not like 'live_%'
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

/** Close markets and emit kickoff events once real kickoff time passes. */
export async function reconcilePostKickoffFixtures(): Promise<{ closed: number; awaiting: number; purgedEvents: number }> {
  if (!hasDatabase()) return { closed: 0, awaiting: 0, purgedEvents: 0 };
  const nowIso = new Date().toISOString();

  const pastKickoff = await query<{ id: string; external_id: string; score_home: number; score_away: number }>(
    `
      select id, external_id, score_home, score_away
      from matches
      where status = 'scheduled'
        and kickoff_at is not null
        and kickoff_at <= $1
    `,
    [nowIso],
  );

  let closed = 0;
  let awaiting = 0;
  let purgedEvents = 0;

  for (const row of pastKickoff) {
    awaiting += 1;
    await closeMarketsForMatch(row.external_id);

    const openMarkets = await query<{ id: string }>(
      "select id from markets where match_id = $1 and closed = false",
      [row.id],
    );
    if (openMarkets.length) {
      await query("update markets set closed = true, updated_at = now() where match_id = $1 and closed = false", [row.id]);
      closed += openMarkets.length;
    }

    const existing = await maybeOne<{ id: string }>(
      `
        select le.id
        from live_events le
        join matches mt on mt.id = le.match_id
        where mt.external_id = $1
          and le.event_type = 'kickoff_waiting'
        limit 1
      `,
      [row.external_id],
    );
    if (!existing) {
      await insertLiveEvent(
        row.external_id,
        "kickoff_waiting",
        "Kickoff — awaiting TxLINE",
        "Markets locked · live score feed pending from TxLINE devnet",
        { matchExternalId: row.external_id },
      );
    }

    if (row.score_home === 0 && row.score_away === 0) {
      const removed = await query<{ id: string }>(
        `
          delete from match_events
          where match_id = $1
            and type = 'goal'
          returning id
        `,
        [row.id],
      );
      purgedEvents += removed.length;
    }
  }

  return { closed, awaiting, purgedEvents };
}

/** Remove duplicate goal rows in the live feed (same TxLINE seq). */
export async function dedupeGoalBroadcasts(): Promise<number> {
  if (!hasDatabase()) return 0;
  const removed = await query<{ id: string }>(
    `
      delete from live_events le
      where le.event_type = 'goal'
        and le.id not in (
          select distinct on (match_id, payload->>'seq') id
          from live_events
          where event_type = 'goal' and payload->>'seq' is not null
          order by match_id, payload->>'seq', created_at asc
        )
      returning id
    `,
  );
  return removed.length;
}

/** Poll TxLINE scores snapshot — state tick + incremental goal events only. */
export async function syncScoresSnapshotsFromTxline(): Promise<number> {
  if (!hasDatabase()) return 0;
  const windowStart = new Date(Date.now() - 8 * 60 * 60_000).toISOString();
  const windowEnd = new Date(Date.now() + 2 * 60 * 60_000).toISOString();

  const rows = await query<{ txline_fixture_id: number; external_id: string }>(
    `
      select txline_fixture_id, external_id
      from matches
      where txline_fixture_id is not null
        and kickoff_at between $1 and $2
        and status not in ('settled')
    `,
    [windowStart, windowEnd],
  );

  let applied = 0;
  for (const row of rows) {
    const fixtureId = Number(row.txline_fixture_id);
    if (!fixtureId) continue;

    const match = await maybeOne<{ id: string; score_seq: number }>(
      "select id, score_seq from matches where txline_fixture_id = $1",
      [fixtureId],
    );
    if (!match) continue;

    const snapshots = await txlineClient.getScoresSnapshot(fixtureId);
    if (!snapshots.length) continue;

    const latest = pickLatestScoreSnapshot(snapshots);
    if (latest) {
      const stateUpdate = scoreSnapshotToUpdate(latest);
      if (stateUpdate) {
        delete stateUpdate.eventType;
        delete stateUpdate.type;
        await processScoreUpdate(stateUpdate, { stateOnly: true });
        applied += 1;
      }
    }

    const maxRow = await maybeOne<{ max: string }>(
      "select coalesce(max(txline_seq), 0)::text as max from match_events where match_id = $1",
      [match.id],
    );
    const maxEventSeq = Number(maxRow?.max ?? 0);

    const timelineActions = new Set(["goal", "yellow_card", "red_card", "corner", "penalty", "var", "substitution"]);
    const newEvents = snapshots
      .filter((raw): raw is Record<string, unknown> => Boolean(raw) && typeof raw === "object")
      .filter((raw) => timelineActions.has(String(raw.Action ?? "").toLowerCase()))
      .filter((raw) => Number(raw.Seq ?? 0) > maxEventSeq)
      .sort((a, b) => Number(a.Seq ?? 0) - Number(b.Seq ?? 0));

    for (const raw of newEvents) {
      const update = scoreSnapshotToUpdate(raw);
      if (update) {
        await processScoreUpdate(update);
        applied += 1;
      }
    }
  }
  return applied;
}

/** @deprecated Prefer syncScoresSnapshotsFromTxline — historical endpoint is often empty on devnet. */
export async function syncHistoricalScoresFromTxline(): Promise<number> {
  return 0;
}

export async function processScoreUpdate(
  payload: Record<string, unknown>,
  options?: { stateOnly?: boolean },
) {
  if (!hasDatabase()) return;
  const fixtureId = Number(payload.fixtureId ?? payload.fixture_id ?? 0);
  if (!fixtureId) return;

  const match = await maybeOne<Record<string, unknown>>("select * from matches where txline_fixture_id = $1", [fixtureId]);
  if (!match) return;

  const action = String(payload.action ?? payload.Action ?? "");
  const gameState = Number(payload.gameState ?? payload.game_state ?? payload.StatusId ?? payload.statusId ?? 1);
  const status = mergeMatchStatus(
    String(match.status),
    mapGameStateToStatus(gameState, String(payload.status ?? ""), action),
  );
  const scoreHome = Number((payload.score as Record<string, number>)?.home ?? payload.scoreHome ?? match.score_home);
  const scoreAway = Number((payload.score as Record<string, number>)?.away ?? payload.scoreAway ?? match.score_away);
  const rawMinute = Number(payload.minute ?? payload.clock ?? 0);
  const minute = rawMinute > 0 ? Math.max(Number(match.minute ?? 0), rawMinute) : Number(match.minute ?? 0);

  const scoreSeq = Number(payload.seq ?? payload.scoreSeq ?? payload.score_seq ?? 0);
  const currentSeq = Number(match.score_seq ?? 0);
  const wasFinished = match.status === "finished" || match.status === "settled";

  const stateChanged =
    scoreHome !== Number(match.score_home) ||
    scoreAway !== Number(match.score_away) ||
    status !== String(match.status) ||
    minute !== Number(match.minute) ||
    scoreSeq > currentSeq;

  if (!stateChanged && options?.stateOnly) return;

  if (scoreSeq > 0 && scoreSeq >= currentSeq) {
    await query(
      "update matches set score_home = $1, score_away = $2, status = $3, minute = $4, score_seq = $5, raw_payload = $6, updated_at = now() where id = $7",
      [scoreHome, scoreAway, status, minute, scoreSeq, payload, match.id],
    );
  } else if (stateChanged) {
    await query(
      "update matches set score_home = $1, score_away = $2, status = $3, minute = $4, raw_payload = $5, updated_at = now() where id = $6",
      [scoreHome, scoreAway, status, minute, payload, match.id],
    );
  }

  if (status === "live" || status === "halftime" || status === "finished" || status === "settled") {
    await closeMarketsForMatch(String(match.external_id));
  }

  if (status === "live" || status === "halftime") {
    try {
      const { syncLiveMarketsForMatch } = await import("./live-markets");
      await syncLiveMarketsForMatch(String(match.id), String(match.external_id), status);
    } catch (err) {
      console.error("live markets sync:", err);
    }
  }

  const eventType = options?.stateOnly ? "" : String(payload.eventType ?? payload.type ?? "");
  if (eventType) {
    const txlineSeq = Number(payload.seq ?? 0);
    if (txlineSeq) {
      const exists = await maybeOne<{ id: string }>(
        "select id from match_events where match_id = $1 and txline_seq = $2",
        [match.id, txlineSeq],
      );
      if (exists) return;
    }

    const mapped = mapScoreEventType(eventType);
    await query(
      `
        insert into match_events (match_id, external_id, txline_seq, minute, type, team_id, player, detail, payload)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        match.id,
        String(payload.seq ?? payload.id ?? `${Date.now()}`),
        txlineSeq || null,
        minute,
        mapped,
        String(payload.teamId ?? payload.team_id ?? ""),
        payload.player ? String(payload.player) : null,
        payload.detail ? String(payload.detail) : null,
        payload,
      ],
    );

    if (mapped === "goal" && txlineSeq) {
      await insertLiveEvent(
        String(match.external_id),
        "goal",
        "Goal",
        `${payload.player ?? "Player"} · ${minute}'`,
        { ...payload, seq: txlineSeq },
      );
      try {
        const { maybeOnGoalEngagement } = await import("./engagement-polls");
        await maybeOnGoalEngagement({
          matchId: String(match.id),
          matchExternalId: String(match.external_id),
          eventKey: `goal_${txlineSeq}`,
          player: payload.player ? String(payload.player) : undefined,
          minute,
        });
      } catch (err) {
        console.error("engagement goal hook:", err);
      }
      try {
        const { settleLiveMarketsOnEvent } = await import("./settlement-live");
        await settleLiveMarketsOnEvent(String(match.id), "goal");
      } catch (err) {
        console.error("live market goal settle:", err);
      }
    }

    if (mapped === "penalty" || mapped === "yellow" || mapped === "red") {
      try {
        const { settleLiveMarketsOnEvent } = await import("./settlement-live");
        await settleLiveMarketsOnEvent(String(match.id), mapped);
      } catch (err) {
        console.error("live market event settle:", err);
      }
    }

    if (mapped === "yellow" && txlineSeq) {
      try {
        const { maybeOnYellowEngagement } = await import("./engagement-polls");
        await maybeOnYellowEngagement({
          matchId: String(match.id),
          eventKey: `yellow_${txlineSeq}`,
        });
      } catch (err) {
        console.error("engagement yellow hook:", err);
      }
    }
  }

  if (status === "finished" && !wasFinished) {
    await enqueueJob("settlement", { matchExternalId: match.external_id, fixtureId });
    const settlementNotice = await maybeOne<{ id: string }>(
      "select id from live_events where match_id = $1 and event_type = 'settlement_started' limit 1",
      [match.id],
    );
    if (!settlementNotice) {
      await insertLiveEvent(String(match.external_id), "settlement_started", "Full time", "Settlement queued", {
        fixtureId,
      });
    }
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
