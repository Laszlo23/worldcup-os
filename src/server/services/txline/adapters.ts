import type { MatchEvent, MatchStats, MatchStatus, Odds, Team } from "@/lib/mock/types";

// TxLINE soccer game phase IDs
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
};

const TEAM_COLORS: Record<string, string> = {
  ARG: "#75AADB", BRA: "#FEDF00", FRA: "#0055A4", GER: "#DD0000",
  ESP: "#AA151B", ENG: "#FFFFFF", POR: "#006600", NED: "#FF6B00",
  ITA: "#0066CC", BEL: "#ED2939", USA: "#3C3B6E", MEX: "#006847",
};

const TEAM_FLAGS: Record<string, string> = {
  ARG: "🇦🇷", BRA: "🇧🇷", FRA: "🇫🇷", GER: "🇩🇪", ESP: "🇪🇸", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  POR: "🇵🇹", NED: "🇳🇱", ITA: "🇮🇹", BEL: "🇧🇪", USA: "🇺🇸", MEX: "🇲🇽",
};

export function mapGameStateToStatus(gameState?: number, statusText?: string): MatchStatus {
  if (statusText?.toLowerCase() === "settled") return "settled";
  if (gameState && SOCCER_PHASE[gameState]) return SOCCER_PHASE[gameState];
  return "scheduled";
}

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

export function defaultOdds(): Odds {
  return { home: 2.1, draw: 3.2, away: 2.8, updatedAt: Date.now() };
}

export function mapScoreEventType(type?: string): MatchEvent["type"] {
  switch ((type ?? "").toLowerCase()) {
    case "goal":
      return "goal";
    case "yellow":
    case "yellowcard":
      return "yellow";
    case "red":
    case "redcard":
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
    odds: row.odds ?? defaultOdds(),
    oddsHistory: row.odds_history ?? [],
  };
}

export function fixtureToMatchRow(fixture: Record<string, unknown>, externalId?: string): Partial<DbMatchRow> {
  const participants = (fixture.participants as Record<string, unknown>[] | undefined) ?? [];
  const home = teamFromParticipant(participants[0] as { id?: number; name?: string; code?: string }, "home");
  const away = teamFromParticipant(participants[1] as { id?: number; name?: string; code?: string }, "away");
  const fixtureId = Number(fixture.fixtureId ?? fixture.id ?? 0);
  const kickoff = fixture.startTime ? new Date(String(fixture.startTime)).toISOString() : null;

  return {
    external_id: externalId ?? `fx-${fixtureId}`,
    txline_fixture_id: fixtureId || null,
    home_team: home,
    away_team: away,
    score_home: Number((fixture.score as Record<string, number>)?.home ?? 0),
    score_away: Number((fixture.score as Record<string, number>)?.away ?? 0),
    status: mapGameStateToStatus(Number(fixture.gameState)),
    minute: Number(fixture.minute ?? 0),
    stadium: String(fixture.venue ?? fixture.stadium ?? ""),
    stage: String(fixture.competition ?? fixture.stage ?? "World Cup"),
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
