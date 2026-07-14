import type { Match } from "@/lib/types";

export type MatchesQueryData = { matches: Match[] };

function mergeMatch(existing: Match, incoming: Match): Match {
  if (
    existing.scoreHome === incoming.scoreHome &&
    existing.scoreAway === incoming.scoreAway &&
    existing.minute === incoming.minute &&
    existing.status === incoming.status &&
    existing.momentum === incoming.momentum
  ) {
    return existing;
  }
  return {
    ...existing,
    scoreHome: incoming.scoreHome,
    scoreAway: incoming.scoreAway,
    minute: incoming.minute,
    status: incoming.status,
    momentum: incoming.momentum,
    winProbability: incoming.winProbability ?? existing.winProbability,
    stats: incoming.stats ?? existing.stats,
    odds: incoming.odds ?? existing.odds,
    oddsHistory: incoming.oddsHistory ?? existing.oddsHistory,
  };
}

export function patchMatchesCache(
  prev: MatchesQueryData | undefined,
  incoming: Match,
  updateType: "match_update" | "odds_update",
): MatchesQueryData | undefined {
  if (!prev?.matches?.length) return prev;

  const idx = prev.matches.findIndex((m) => m.id === incoming.id);
  if (idx === -1) {
    return { matches: [...prev.matches, incoming] };
  }

  const current = prev.matches[idx]!;
  const merged =
    updateType === "odds_update"
      ? {
          ...current,
          odds: incoming.odds ?? current.odds,
          oddsHistory: incoming.oddsHistory ?? current.oddsHistory,
          momentum: incoming.momentum ?? current.momentum,
          winProbability: incoming.winProbability ?? current.winProbability,
        }
      : mergeMatch(current, incoming);

  if (merged === current) return prev;

  const next = [...prev.matches];
  next[idx] = merged;
  return { matches: next };
}
