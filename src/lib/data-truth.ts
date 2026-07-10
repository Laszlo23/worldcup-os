import type { MatchStats, Odds } from "@/lib/mock/types";

/** Fixture IDs reserved for offline replay / hackathon seed — never show as live data. */
export const DEMO_FIXTURE_IDS = new Set([900001, 900002, 900007]);

export const DEMO_WALLET_PUBKEYS = new Set([
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "9aBzK3mN8pQr2sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq",
  "3FpqR7sT1uVwXyZ2aBcDeFgHiJkLmNoPqRsTuVwXyZ",
  "Hn2Mk5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNoPq",
  "Cw8Rk2mN5pQr8sTvWxYz1uVwXyZ4aBcDeFgHiJkLmNo",
]);

export function isDemoFixtureId(fixtureId: number | null | undefined): boolean {
  return fixtureId != null && DEMO_FIXTURE_IDS.has(fixtureId);
}

export function isDemoProofSignature(signature: string | null | undefined): boolean {
  if (!signature) return true;
  return /demo/i.test(signature);
}

export function hasRealOdds(odds: Partial<Odds> | null | undefined): odds is Odds {
  if (!odds || typeof odds !== "object") return false;
  const home = Number(odds.home);
  const draw = Number(odds.draw);
  const away = Number(odds.away);
  return Number.isFinite(home) && Number.isFinite(draw) && Number.isFinite(away) && home > 1 && draw > 1 && away > 1;
}

export function parseRealOdds(odds: Partial<Odds> | null | undefined): Odds | null {
  if (!hasRealOdds(odds)) return null;
  return {
    home: Number(odds.home),
    draw: Number(odds.draw),
    away: Number(odds.away),
    updatedAt: Number.isFinite(Number(odds.updatedAt)) ? Number(odds.updatedAt) : Date.now(),
  };
}

export function hasRealStats(stats: MatchStats | null | undefined): boolean {
  if (!stats) return false;
  const allZero =
    stats.shots[0] === 0 &&
    stats.shots[1] === 0 &&
    stats.shotsOnTarget[0] === 0 &&
    stats.shotsOnTarget[1] === 0 &&
    stats.xg[0] === 0 &&
    stats.xg[1] === 0 &&
    stats.corners[0] === 0 &&
    stats.corners[1] === 0;
  const defaultPossession = stats.possession[0] === 50 && stats.possession[1] === 50;
  return !(allZero && defaultPossession);
}

/** SQL fragment: exclude demo-tagged rows (requires `source` column). */
export const EXCLUDE_DEMO_SOURCE_SQL = "coalesce(source, 'txline') <> 'demo'";
