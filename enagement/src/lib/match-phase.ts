import type { Match, MatchStatus } from "./types";

/** UI / product phase — derived from TxLINE status + kickoff clock. */
export type MatchFeedPhase =
  | "predictable"
  | "closing_soon"
  | "locked"
  | "awaiting_feed"
  | "live"
  | "halftime"
  | "finished";

const MARKET_CLOSE_MS = 5 * 60_000;

export function getMatchFeedPhase(match: Pick<Match, "status" | "kickoff">, now = Date.now()): MatchFeedPhase {
  if (match.status === "finished" || match.status === "settled") return "finished";
  if (match.status === "halftime") return "halftime";
  if (match.status === "live") return "live";

  const msToKickoff = match.kickoff - now;
  if (msToKickoff <= 0) return "awaiting_feed";
  if (msToKickoff <= MARKET_CLOSE_MS) return "locked";
  if (msToKickoff <= 60 * 60_000) return "closing_soon";
  return "predictable";
}

export function isMatchInPlayPhase(match: Pick<Match, "status" | "kickoff">, now = Date.now()): boolean {
  const phase = getMatchFeedPhase(match, now);
  return phase === "live" || phase === "halftime" || phase === "awaiting_feed" || phase === "finished";
}

export function isMatchBettableByClock(match: Pick<Match, "status" | "kickoff">, now = Date.now()): boolean {
  if (match.status !== "scheduled") return false;
  return now < match.kickoff - MARKET_CLOSE_MS;
}

export function matchPhaseLabel(phase: MatchFeedPhase): string {
  switch (phase) {
    case "predictable":
      return "Open for predictions";
    case "closing_soon":
      return "Markets closing soon";
    case "locked":
      return "Markets locked";
    case "awaiting_feed":
      return "Awaiting TxLINE live feed";
    case "live":
      return "Live";
    case "halftime":
      return "Half-time";
    case "finished":
      return "Full time";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function statusCountsForMatches(
  matches: Pick<Match, "status" | "kickoff">[],
  now = Date.now(),
): { live: number; upcoming: number; inProgress: number; finished: number } {
  let live = 0;
  let upcoming = 0;
  let inProgress = 0;
  let finished = 0;
  for (const m of matches) {
    const phase = getMatchFeedPhase(m, now);
    if (phase === "finished") finished += 1;
    else if (phase === "live" || phase === "halftime") live += 1;
    else if (phase === "awaiting_feed") inProgress += 1;
    else upcoming += 1;
  }
  return { live, upcoming, inProgress, finished };
}

export function matchStatusRank(status: MatchStatus, kickoff: number, now = Date.now()): number {
  const phase = getMatchFeedPhase({ status, kickoff }, now);
  switch (phase) {
    case "live":
      return 0;
    case "halftime":
      return 1;
    case "awaiting_feed":
      return 2;
    case "closing_soon":
      return 3;
    case "locked":
      return 4;
    case "predictable":
      return 5;
    case "finished":
      return 6;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

/** Featured surfaces only show actionable / in-progress fixtures — never full-time. */
export function isMatchFeatured(match: Pick<Match, "status" | "kickoff">, now = Date.now()): boolean {
  return getMatchFeedPhase(match, now) !== "finished";
}

export function selectFeaturedMatches<T extends Pick<Match, "status" | "kickoff">>(
  matches: T[],
  limit: number,
  now = Date.now(),
): T[] {
  return [...matches]
    .filter((m) => isMatchFeatured(m, now))
    .sort((a, b) => {
      const rank = matchStatusRank(a.status, a.kickoff, now) - matchStatusRank(b.status, b.kickoff, now);
      if (rank !== 0) return rank;
      return a.kickoff - b.kickoff;
    })
    .slice(0, limit);
}
