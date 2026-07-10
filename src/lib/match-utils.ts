import type { Odds } from "@/lib/mock/types";
import { hasRealOdds, parseRealOdds } from "@/lib/data-truth";

/** @deprecated Use parseRealOdds — no fake fallbacks for production UI. */
export function defaultOdds(): Odds {
  return { home: 2.1, draw: 3.2, away: 2.8, updatedAt: Date.now() };
}

/** Returns real odds only — never fabricates placeholder prices. */
export function normalizeOdds(odds: Partial<Odds> | null | undefined): Odds | null {
  return parseRealOdds(odds);
}

export { hasRealOdds, parseRealOdds };
