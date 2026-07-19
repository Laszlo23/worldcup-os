import type { Match } from "@/lib/types";

export type MatchFeedPhase =
  | "predictable"
  | "closing_soon"
  | "locked"
  | "awaiting_feed"
  | "live"
  | "halftime"
  | "finished";

const MARKET_CLOSE_MS = 5 * 60_000;

function parseKickoffMs(match: Pick<Match, "status"> & { kickoffAt?: string | number | null }): number {
  if (typeof match.kickoffAt === "number") return match.kickoffAt;
  if (typeof match.kickoffAt === "string") {
    const parsed = Date.parse(match.kickoffAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export function getMatchFeedPhase(
  match: Pick<Match, "status"> & { kickoffAt?: string | number | null },
  now = Date.now(),
): MatchFeedPhase {
  const status = match.status.toLowerCase();
  if (status === "finished" || status === "settled") return "finished";
  if (status === "halftime") return "halftime";
  if (status === "live" || status === "inprogress" || status === "in_progress") return "live";

  const kickoff = parseKickoffMs(match);
  if (kickoff > 0) {
    const msToKickoff = kickoff - now;
    if (msToKickoff <= 0) return "awaiting_feed";
    if (msToKickoff <= MARKET_CLOSE_MS) return "locked";
    if (msToKickoff <= 60 * 60_000) return "closing_soon";
  }
  return "predictable";
}

export function isLiveTabMatch(match: Pick<Match, "status"> & { kickoffAt?: string | number | null }, now = Date.now()): boolean {
  const phase = getMatchFeedPhase(match, now);
  return phase === "live" || phase === "halftime" || phase === "awaiting_feed";
}

export function isUpcomingTabMatch(match: Pick<Match, "status"> & { kickoffAt?: string | number | null }, now = Date.now()): boolean {
  const phase = getMatchFeedPhase(match, now);
  return phase === "predictable" || phase === "closing_soon" || phase === "locked";
}

export function isFinishedTabMatch(match: Pick<Match, "status">): boolean {
  const status = match.status.toLowerCase();
  return status === "finished" || status === "settled";
}

export function isLiveBettableMatch(match: Pick<Match, "status">): boolean {
  const status = match.status.toLowerCase();
  return status === "live" || status === "halftime";
}

export function matchPriority(
  match: Pick<Match, "status" | "minute"> & { kickoffAt?: string | number | null },
  now = Date.now(),
): number {
  const phase = getMatchFeedPhase(match, now);
  const phaseRank: Record<MatchFeedPhase, number> = {
    live: 0,
    halftime: 1,
    awaiting_feed: 2,
    locked: 3,
    closing_soon: 4,
    predictable: 5,
    finished: 6,
  };
  let score = phaseRank[phase] * 10_000;
  if (phase === "live" || phase === "halftime") {
    score -= Math.min(match.minute, 120);
  }
  const kickoff = parseKickoffMs(match);
  if (kickoff > 0) {
    score += Math.min(2_000, Math.abs(kickoff - now) / 60_000);
  }
  return score;
}

/** Pick the match to feature on the homepage: in-play first, then signal-linked, then nearest kickoff. */
export function pickFeaturedMatch(
  matches: Match[],
  options?: { signalMatchId?: string; now?: number },
): Match | undefined {
  if (!matches.length) return undefined;
  const now = options?.now ?? Date.now();
  const signalMatchId = options?.signalMatchId;

  const inPlay = matches.filter((m) => isLiveTabMatch(m, now));
  if (inPlay.length) {
    return [...inPlay].sort((a, b) => matchPriority(a, now) - matchPriority(b, now))[0];
  }

  if (signalMatchId) {
    const linked = matches.find((m) => m.id === signalMatchId);
    if (linked) return linked;
  }

  const upcoming = matches.filter((m) => isUpcomingTabMatch(m, now));
  if (upcoming.length) {
    return [...upcoming].sort((a, b) => {
      const ka = parseKickoffMs(a);
      const kb = parseKickoffMs(b);
      if (ka && kb) return Math.abs(ka - now) - Math.abs(kb - now);
      return matchPriority(a, now) - matchPriority(b, now);
    })[0];
  }

  return [...matches].sort((a, b) => matchPriority(a, now) - matchPriority(b, now))[0];
}

export function matchPhaseLabel(phase: MatchFeedPhase): string {
  switch (phase) {
    case "predictable":
      return "Upcoming";
    case "closing_soon":
      return "Closing soon";
    case "locked":
      return "Locked";
    case "awaiting_feed":
      return "Awaiting feed";
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
