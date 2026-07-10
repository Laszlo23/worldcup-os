import type { MatchEvent, MatchStats, MatchStatus, Odds, Team } from "@/lib/mock/types";
import { defaultOdds, normalizeOdds } from "@/lib/match-utils";
import { isDemoFixtureId } from "@/lib/data-truth";

// TxLINE soccer game phase IDs (+ vendor extensions)
const SOCCER_PHASE: Record<number, MatchStatus> = {
  1: "scheduled", // NS
  2: "live", // H1
  3: "halftime", // HT
  4: "live", // H2
  5: "finished", // F
  7: "live", // ET1
  8: "halftime", // HTET
  9: "live", // ET2
  10: "finished", // FET
  12: "live", // PE
  13: "finished", // FPE
  100: "finished", // game_finalised (TxLINE SL1)
};

const STATUS_RANK: Record<MatchStatus, number> = {
  scheduled: 0,
  live: 1,
  halftime: 2,
  finished: 3,
  settled: 4,
};

export function mergeMatchStatus(current: string, incoming: MatchStatus): MatchStatus {
  const cur = current in STATUS_RANK ? (current as MatchStatus) : "scheduled";
  return STATUS_RANK[incoming] >= STATUS_RANK[cur] ? incoming : cur;
}

export function mapGameStateToStatus(gameState?: number, statusText?: string, action?: string): MatchStatus {
  if (statusText?.toLowerCase() === "settled") return "settled";
  const normalizedAction = (action ?? "").toLowerCase();
  if (normalizedAction === "game_finalised" || normalizedAction === "game_finalized") return "finished";
  if (gameState && SOCCER_PHASE[gameState]) return SOCCER_PHASE[gameState];
  return "scheduled";
}

const TEAM_COLORS: Record<string, string> = {
  ARG: "#75AADB", BRA: "#FEDF00", FRA: "#0055A4", GER: "#DD0000",
  ESP: "#AA151B", ENG: "#FFFFFF", POR: "#006600", NED: "#FF6B00",
  ITA: "#0066CC", BEL: "#ED2939", USA: "#3C3B6E", MEX: "#006847",
};

const TEAM_FLAGS: Record<string, string> = {
  ARG: "🇦🇷", BRA: "🇧🇷", FRA: "🇫🇷", GER: "🇩🇪", ESP: "🇪🇸", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  POR: "🇵🇹", NED: "🇳🇱", ITA: "🇮🇹", BEL: "🇧🇪", USA: "🇺🇸", MEX: "🇲🇽",
};

export function teamFromParticipant(p: { id?: number | string; name?: string; code?: string } | undefined, fallbackId: string): Team {
  const code = (p?.code ?? fallbackId.slice(0, 3)).toUpperCase();
  const id = String(p?.id ?? fallbackId);
  return {
    id,
    name: p?.name ?? code,
    code,
    flag: TEAM_FLAGS[code] ?? "⚽",
    color: TEAM_COLORS[code] ?? "#888888",
  };
}

export function defaultStats(): MatchStats {
  return {
    possession: [50, 50],
    shots: [0, 0],
    shotsOnTarget: [0, 0],
    xg: [0, 0],
    corners: [0, 0],
    fouls: [0, 0],
  };
}

export { defaultOdds, normalizeOdds } from "@/lib/match-utils";

export function mapScoreEventType(type?: string): MatchEvent["type"] {
  switch ((type ?? "").toLowerCase()) {
    case "goal":
      return "goal";
    case "yellow":
    case "yellowcard":
    case "yellow_card":
      return "yellow";
    case "red":
    case "redcard":
    case "red_card":
      return "red";
    case "corner":
      return "corner";
    case "penalty":
      return "penalty";
    case "var":
      return "var";
    case "substitution":
    case "sub":
      return "sub";
    default:
      return "goal";
  }
}

type ScoreParticipantTotals = { Goals?: number; Corners?: number; YellowCards?: number };

function readParticipantGoals(participant: unknown): number {
  if (!participant || typeof participant !== "object") return 0;
  const total = (participant as { Total?: ScoreParticipantTotals }).Total;
  return Number(total?.Goals ?? 0);
}

/** Pick the newest score snapshot row that carries live state (skip disconnect heartbeats). */
export function pickLatestScoreSnapshot(rows: unknown[]): Record<string, unknown> | null {
  const candidates = rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .filter((row) => {
      if (String(row.Action ?? "").toLowerCase() === "disconnected") return false;
      const score = row.Score as Record<string, unknown> | undefined;
      const hasScore = Boolean(score?.Participant1 || score?.Participant2);
      const statusId = Number(row.StatusId ?? row.statusId ?? 0);
      return hasScore || statusId > 0;
    })
    .sort((a, b) => Number(b.Seq ?? 0) - Number(a.Seq ?? 0));
  return candidates[0] ?? null;
}

/** Normalize TxLINE `/scores/snapshot/{fixtureId}` row for `processScoreUpdate`. */
export function scoreSnapshotToUpdate(row: Record<string, unknown>): Record<string, unknown> | null {
  const score = row.Score as Record<string, unknown> | undefined;
  if (!score?.Participant1 && !score?.Participant2 && !row.StatusId) return null;

  const fixtureId = Number(row.FixtureId ?? row.fixtureId ?? 0);
  if (!fixtureId) return null;

  const action = String(row.Action ?? "").toLowerCase();
  let statusId = Number(row.StatusId ?? row.statusId ?? row.GameState ?? 1);
  if (action === "game_finalised" || action === "game_finalized") statusId = 100;

  const clock = row.Clock as { Running?: boolean; Seconds?: number } | undefined;
  const minute = clock?.Seconds != null ? Math.max(0, Math.floor(Number(clock.Seconds) / 60)) : 0;

  const scoreHome = readParticipantGoals(score?.Participant1);
  const scoreAway = readParticipantGoals(score?.Participant2);

  const eventTypes = new Set(["goal"]);
  const payload: Record<string, unknown> = {
    fixtureId,
    fixture_id: fixtureId,
    gameState: statusId,
    StatusId: statusId,
    scoreHome,
    scoreAway,
    score: { home: scoreHome, away: scoreAway },
    minute,
    seq: Number(row.Seq ?? row.seq ?? 0),
    Ts: row.Ts,
    source: "scores_snapshot",
    action,
  };

  if (eventTypes.has(action)) {
    payload.eventType = action === "yellow_card" ? "yellow" : action === "red_card" ? "red" : action;
    payload.type = payload.eventType;
    const data = row.Data as Record<string, unknown> | undefined;
    if (data?.PlayerId != null) payload.player = String(data.PlayerId);
    const participantSide = Number(row.Participant ?? 0);
    if (participantSide === 1) payload.teamId = "home";
    if (participantSide === 2) payload.teamId = "away";
  }

  return payload;
}

export interface DbMatchRow {
  id: string;
  external_id: string;
  txline_fixture_id: number | null;
  home_team: Team;
  away_team: Team;
  score_home: number;
  score_away: number;
  status: string;
  minute: number;
  stadium: string | null;
  stage: string | null;
  kickoff_at: string | null;
  stats: MatchStats;
  odds: Odds;
  odds_history: { t: number; home: number; draw: number; away: number }[];
  has_verified_proof?: boolean;
}

export function dbRowToMatch(row: DbMatchRow, events: MatchEvent[] = []) {
  return {
    id: row.external_id,
    home: row.home_team,
    away: row.away_team,
    scoreHome: row.score_home,
    scoreAway: row.score_away,
    status: row.status as MatchStatus,
    minute: row.minute,
    stadium: row.stadium ?? "",
    stage: row.stage ?? "",
    kickoff: row.kickoff_at ? new Date(row.kickoff_at).getTime() : Date.now(),
    events,
    stats: row.stats ?? defaultStats(),
    odds: normalizeOdds(row.odds) ?? { home: 0, draw: 0, away: 0, updatedAt: 0 },
    oddsHistory: row.odds_history ?? [],
    hasVerifiedProof: Boolean(row.has_verified_proof),
  };
}

export function fixtureToMatchRow(fixture: Record<string, unknown>, externalId?: string): Partial<DbMatchRow> {
  const participants = (fixture.participants as Record<string, unknown>[] | undefined) ?? [];
  const homeRaw = participants[0] as { id?: number; name?: string; code?: string } | undefined;
  const awayRaw = participants[1] as { id?: number; name?: string; code?: string } | undefined;

  const fixtureId = Number(
    fixture.fixtureId ?? fixture.FixtureId ?? fixture.id ?? fixture.FixtureGroupId ?? 0,
  );

  const home = participants.length
    ? teamFromParticipant(homeRaw, "home")
    : teamFromParticipant(
        {
          id: fixture.Participant1Id as number | undefined,
          name: String(fixture.Participant1 ?? fixture.participant1 ?? "Home"),
          code: String(fixture.Participant1 ?? fixture.participant1 ?? "HOM").slice(0, 3).toUpperCase(),
        },
        "home",
      );

  const away = participants.length
    ? teamFromParticipant(awayRaw, "away")
    : teamFromParticipant(
        {
          id: fixture.Participant2Id as number | undefined,
          name: String(fixture.Participant2 ?? fixture.participant2 ?? "Away"),
          code: String(fixture.Participant2 ?? fixture.participant2 ?? "AWA").slice(0, 3).toUpperCase(),
        },
        "away",
      );

  const kickoffRaw = fixture.startTime ?? fixture.StartTime ?? fixture.Ts;
  const kickoff = kickoffRaw ? new Date(Number(kickoffRaw)).toISOString() : null;
  const gameState = Number(fixture.gameState ?? fixture.GameState ?? 1);

  return {
    external_id: externalId ?? `fx-${fixtureId}`,
    txline_fixture_id: fixtureId || null,
    home_team: home,
    away_team: away,
    score_home: Number(
      (fixture.score as Record<string, number> | undefined)?.home ??
        fixture.ScoreHome ??
        fixture.scoreHome ??
        fixture.Score1 ??
        fixture.score1 ??
        fixture.Participant1Score ??
        0,
    ),
    score_away: Number(
      (fixture.score as Record<string, number> | undefined)?.away ??
        fixture.ScoreAway ??
        fixture.scoreAway ??
        fixture.Score2 ??
        fixture.score2 ??
        fixture.Participant2Score ??
        0,
    ),
    status: mapGameStateToStatus(gameState),
    minute: Number(fixture.minute ?? fixture.Minute ?? 0),
    stadium: String(fixture.venue ?? fixture.Venue ?? fixture.stadium ?? ""),
    stage: String(fixture.competition ?? fixture.Competition ?? fixture.stage ?? "World Cup"),
    kickoff_at: kickoff,
    stats: defaultStats(),
    odds: defaultOdds(),
    odds_history: [],
    raw_payload: fixture,
  };
}

export function resolveMarketOutcome(
  marketType: string,
  outcomeLabel: string,
  scoreHome: number,
  scoreAway: number,
  firstScorer?: string,
): boolean {
  const total = scoreHome + scoreAway;
  switch (marketType) {
    case "winner": {
      if (outcomeLabel.toLowerCase().includes("draw")) return scoreHome === scoreAway;
      // simplistic: label contains home/away team name matching higher score side handled upstream
      return false;
    }
    case "over_2_5":
      return outcomeLabel.toLowerCase().includes("over") ? total > 2.5 : total < 2.5;
    case "btts":
      return outcomeLabel.toLowerCase() === "yes"
        ? scoreHome > 0 && scoreAway > 0
        : scoreHome === 0 || scoreAway === 0;
    case "correct_score": {
      const normalized = outcomeLabel.replace(/\s/g, "").replace("–", "-");
      const [h, a] = normalized.split("-").map(Number);
      return h === scoreHome && a === scoreAway;
    }
    case "first_scorer":
      if (outcomeLabel.toLowerCase().includes("no goal")) return total === 0;
      return firstScorer ? outcomeLabel.includes(firstScorer) : false;
    default:
      return false;
  }
}

export function resolveWinnerOutcome(
  homeName: string,
  awayName: string,
  outcomeLabel: string,
  scoreHome: number,
  scoreAway: number,
): boolean {
  if (outcomeLabel.toLowerCase().includes("draw")) return scoreHome === scoreAway;
  if (scoreHome === scoreAway) return false;
  const homeWins = scoreHome > scoreAway;
  if (outcomeLabel.includes(homeName) || outcomeLabel === homeName) return homeWins;
  if (outcomeLabel.includes(awayName) || outcomeLabel === awayName) return !homeWins;
  return false;
}
