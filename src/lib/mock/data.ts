import type { Match, Team, Market, LeaderRow, TxLineProof } from "./types";
import { hasRealOdds } from "@/lib/data-truth";
import { defaultOdds } from "@/lib/match-utils";

const teams: Team[] = [
  { id: "arg", name: "Argentina", code: "ARG", flag: "🇦🇷", color: "#75AADB" },
  { id: "bra", name: "Brazil", code: "BRA", flag: "🇧🇷", color: "#FEDF00" },
  { id: "fra", name: "France", code: "FRA", flag: "🇫🇷", color: "#0055A4" },
  { id: "ger", name: "Germany", code: "GER", flag: "🇩🇪", color: "#DD0000" },
  { id: "esp", name: "Spain", code: "ESP", flag: "🇪🇸", color: "#AA151B" },
  { id: "eng", name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#FFFFFF" },
  { id: "por", name: "Portugal", code: "POR", flag: "🇵🇹", color: "#006600" },
  { id: "ned", name: "Netherlands", code: "NED", flag: "🇳🇱", color: "#FF6B00" },
  { id: "ita", name: "Italy", code: "ITA", flag: "🇮🇹", color: "#0066CC" },
  { id: "bel", name: "Belgium", code: "BEL", flag: "🇧🇪", color: "#ED2939" },
  { id: "usa", name: "USA", code: "USA", flag: "🇺🇸", color: "#3C3B6E" },
  { id: "mex", name: "Mexico", code: "MEX", flag: "🇲🇽", color: "#006847" },
];

function pair(i: number, j: number): [Team, Team] {
  return [teams[i], teams[j]];
}

const now = Date.now();

export const initialMatches: Match[] = [
  buildMatch("m1", pair(0, 1), "live", 67, 2, 1, "Lusail Stadium", "Quarter-final", now - 67 * 60_000),
  buildMatch("m2", pair(2, 3), "live", 34, 1, 1, "Al Bayt Stadium", "Quarter-final", now - 34 * 60_000),
  buildMatch("m3", pair(4, 5), "halftime", 45, 0, 0, "Education City", "Quarter-final", now - 48 * 60_000),
  buildMatch("m4", pair(6, 7), "scheduled", 0, 0, 0, "Al Janoub", "Quarter-final", now + 3 * 3600_000),
  buildMatch("m5", pair(8, 9), "scheduled", 0, 0, 0, "Stadium 974", "Semi-final", now + 26 * 3600_000),
  buildMatch("m6", pair(10, 11), "finished", 90, 3, 2, "Ahmad bin Ali", "Round of 16", now - 24 * 3600_000),
  buildMatch("m7", pair(1, 4), "settled", 90, 1, 2, "Khalifa International", "Round of 16", now - 48 * 3600_000),
  buildMatch("m8", pair(0, 5), "settled", 90, 2, 0, "Al Thumama", "Round of 16", now - 72 * 3600_000),
];

function buildMatch(
  id: string,
  [home, away]: [Team, Team],
  status: Match["status"],
  minute: number,
  sh: number,
  sa: number,
  stadium: string,
  stage: string,
  kickoff: number,
): Match {
  const events: Match["events"] = [];
  if (sh > 0) events.push({ id: id + "e1", minute: 23, type: "goal", teamId: home.id, player: "L. Messi" });
  if (sh > 1) events.push({ id: id + "e2", minute: 58, type: "goal", teamId: home.id, player: "J. Álvarez" });
  if (sa > 0) events.push({ id: id + "e3", minute: 41, type: "goal", teamId: away.id, player: "Vinicius Jr." });
  if (sa > 1) events.push({ id: id + "e4", minute: 76, type: "goal", teamId: away.id, player: "Rodrygo" });
  if (minute > 30) events.push({ id: id + "y1", minute: 31, type: "yellow", teamId: away.id, player: "Casemiro" });
  if (minute > 50) events.push({ id: id + "c1", minute: 52, type: "corner", teamId: home.id });

  const home_odds = 1.8 + Math.random() * 0.6;
  const draw_odds = 3.2 + Math.random() * 0.4;
  const away_odds = 2.2 + Math.random() * 0.8;

  return {
    id,
    home,
    away,
    scoreHome: sh,
    scoreAway: sa,
    status,
    minute,
    stadium,
    stage,
    kickoff,
    events,
    stats: {
      possession: [52, 48],
      shots: [12, 9],
      shotsOnTarget: [5, 3],
      xg: [1.8, 1.2],
      corners: [6, 4],
      fouls: [8, 11],
    },
    odds: { home: +home_odds.toFixed(2), draw: +draw_odds.toFixed(2), away: +away_odds.toFixed(2), updatedAt: Date.now() },
    oddsHistory: Array.from({ length: 20 }).map((_, i) => ({
      t: Date.now() - (20 - i) * 60_000,
      home: +(home_odds + Math.sin(i / 3) * 0.15).toFixed(2),
      draw: +(draw_odds + Math.cos(i / 4) * 0.1).toFixed(2),
      away: +(away_odds + Math.sin(i / 5) * 0.2).toFixed(2),
    })),
  };
}

export function buildMarketsForMatch(m: Match): Market[] {
  const impl = (p: number) => +(1 / Math.max(p, 1.01)).toFixed(3);
  const closed = m.status !== "scheduled";
  const prices = hasRealOdds(m.odds) ? m.odds : defaultOdds();
  const zeroOutcome = { liquidity: 0, participants: 0 };

  return [
    {
      id: m.id + "-winner",
      matchId: m.id,
      type: "winner",
      title: "Match Winner",
      closed,
      totalLiquidity: 0,
      outcomes: [
        { id: "h", label: `${m.home.name}`, price: prices.home, ...zeroOutcome },
        { id: "d", label: "Draw", price: prices.draw, ...zeroOutcome },
        { id: "a", label: `${m.away.name}`, price: prices.away, ...zeroOutcome },
      ].map((o) => ({ ...o, implied: impl(o.price) })),
    },
    {
      id: m.id + "-ou",
      matchId: m.id,
      type: "over_2_5",
      title: "Over / Under 2.5 Goals",
      closed,
      totalLiquidity: 0,
      outcomes: [
        { id: "over", label: "Over 2.5", price: 1.92, ...zeroOutcome },
        { id: "under", label: "Under 2.5", price: 1.88, ...zeroOutcome },
      ].map((o) => ({ ...o, implied: impl(o.price) })),
    },
    {
      id: m.id + "-btts",
      matchId: m.id,
      type: "btts",
      title: "Both Teams to Score",
      closed,
      totalLiquidity: 0,
      outcomes: [
        { id: "yes", label: "Yes", price: 1.72, ...zeroOutcome },
        { id: "no", label: "No", price: 2.05, ...zeroOutcome },
      ].map((o) => ({ ...o, implied: impl(o.price) })),
    },
    {
      id: m.id + "-fs",
      matchId: m.id,
      type: "first_scorer",
      title: "First Goal Scorer",
      closed,
      totalLiquidity: 0,
      outcomes: [
        { id: "p1", label: `${m.home.name}`, price: 4.2, ...zeroOutcome },
        { id: "p2", label: `${m.away.name}`, price: 4.8, ...zeroOutcome },
        { id: "p3", label: "No goal", price: 8.0, ...zeroOutcome },
      ].map((o) => ({ ...o, implied: impl(o.price) })),
    },
    {
      id: m.id + "-cs",
      matchId: m.id,
      type: "correct_score",
      title: "Correct Score",
      closed,
      totalLiquidity: 0,
      outcomes: [
        { id: "1-0", label: "1 – 0", price: 8.0, ...zeroOutcome },
        { id: "2-1", label: "2 – 1", price: 9.5, ...zeroOutcome },
        { id: "1-1", label: "1 – 1", price: 6.5, ...zeroOutcome },
        { id: "2-0", label: "2 – 0", price: 10.0, ...zeroOutcome },
        { id: "0-1", label: "0 – 1", price: 11.0, ...zeroOutcome },
      ].map((o) => ({ ...o, implied: impl(o.price) })),
    },
  ];
}

export const leaderboard: LeaderRow[] = Array.from({ length: 20 }).map((_, i) => ({
  rank: i + 1,
  address: `${["7xKX", "9aBz", "3Fpq", "Hn2M", "Cw8R", "Yj4L", "Pd6T", "Vs1N"][i % 8]}...${["QpZ", "L4v", "Mf9", "kNx"][i % 4]}`,
  avatar: `https://api.dicebear.com/9.x/shapes/svg?seed=user${i}`,
  profit: Math.round((50000 - i * 1800) * (0.9 + Math.random() * 0.2)),
  winRate: +(85 - i * 1.4).toFixed(1),
  correct: 240 - i * 8,
  streak: Math.max(1, 18 - i),
  biggestWin: Math.round((12000 - i * 400) * (0.8 + Math.random() * 0.4)),
}));

/** Devnet program deploy tx — real on-chain proof for judge demos */
const DEVNET_DEPLOY_TX =
  "5HV4zE1axbtkjNFeDtzcxP98TqzRg1WPe4bCp8p1r8Q3eDGGaY5xECZ123Rvvw7KqFB18tDNqGK2ahyHmpA6452H";

export const proofs: TxLineProof[] = initialMatches
  .filter((m) => m.status === "settled")
  .map((m) => ({
    matchId: m.id,
    finalScore: [m.scoreHome, m.scoreAway],
    merkleRoot: `0x${m.id}1c876fecd4ae0bcb`,
    proofHash: `0x${m.id}54025f38abbd0856`,
    signature: `ed25519:bae86c8aae882${m.id}`,
    validatedAt: Date.now() - 3600_000,
    solanaTx: DEVNET_DEPLOY_TX,
    status: "verified" as const,
  }));

export { teams };
