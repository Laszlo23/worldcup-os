import type { Match, Team, Market, LeaderRow, TxLineProof } from "./types";

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
  const impl = (p: number) => +(1 / p).toFixed(3);
  return [
    {
      id: m.id + "-winner",
      matchId: m.id,
      type: "winner",
      title: "Match Winner",
      closed: m.status === "finished" || m.status === "settled",
      totalLiquidity: 128_400 + Math.random() * 40_000,
      outcomes: [
        { id: "h", label: `${m.home.name}`, price: m.odds.home, liquidity: 48_200, participants: 312 },
        { id: "d", label: "Draw", price: m.odds.draw, liquidity: 32_100, participants: 187 },
        { id: "a", label: `${m.away.name}`, price: m.odds.away, liquidity: 48_100, participants: 274 },
      ].map((o) => ({ ...o, implied: impl(o.price) })),
    },
    {
      id: m.id + "-ou",
      matchId: m.id,
      type: "over_2_5",
      title: "Over / Under 2.5 Goals",
      closed: m.status === "finished" || m.status === "settled",
      totalLiquidity: 82_100,
      outcomes: [
        { id: "over", label: "Over 2.5", price: 1.92, liquidity: 42_000, participants: 220 },
        { id: "under", label: "Under 2.5", price: 1.88, liquidity: 40_100, participants: 198 },
      ],
    },
    {
      id: m.id + "-btts",
      matchId: m.id,
      type: "btts",
      title: "Both Teams to Score",
      closed: m.status === "finished" || m.status === "settled",
      totalLiquidity: 54_300,
      outcomes: [
        { id: "yes", label: "Yes", price: 1.72, liquidity: 30_100, participants: 180 },
        { id: "no", label: "No", price: 2.05, liquidity: 24_200, participants: 142 },
      ],
    },
    {
      id: m.id + "-fs",
      matchId: m.id,
      type: "first_scorer",
      title: "First Goal Scorer",
      closed: m.status === "finished" || m.status === "settled",
      totalLiquidity: 41_800,
      outcomes: [
        { id: "p1", label: "L. Messi", price: 4.2, liquidity: 12_300, participants: 88 },
        { id: "p2", label: "Vinicius Jr.", price: 4.8, liquidity: 10_100, participants: 71 },
        { id: "p3", label: "K. Mbappé", price: 5.5, liquidity: 8_400, participants: 62 },
        { id: "p4", label: "No goal", price: 8.0, liquidity: 5_000, participants: 30 },
      ],
    },
    {
      id: m.id + "-cs",
      matchId: m.id,
      type: "correct_score",
      title: "Correct Score",
      closed: m.status === "finished" || m.status === "settled",
      totalLiquidity: 38_400,
      outcomes: [
        { id: "1-0", label: "1 – 0", price: 8.0, liquidity: 6_200, participants: 42 },
        { id: "2-1", label: "2 – 1", price: 9.5, liquidity: 7_100, participants: 51 },
        { id: "1-1", label: "1 – 1", price: 6.5, liquidity: 8_400, participants: 63 },
        { id: "2-0", label: "2 – 0", price: 10.0, liquidity: 5_600, participants: 34 },
        { id: "0-1", label: "0 – 1", price: 11.0, liquidity: 4_100, participants: 28 },
      ],
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

export const proofs: TxLineProof[] = initialMatches
  .filter((m) => m.status === "settled")
  .map((m) => ({
    matchId: m.id,
    finalScore: [m.scoreHome, m.scoreAway],
    merkleRoot: "0x" + Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10),
    proofHash: "0x" + Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10),
    signature: "ed25519:" + Math.random().toString(16).slice(2, 20),
    validatedAt: Date.now() - 3600_000,
    solanaTx: Array.from({ length: 44 }).map(() => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 58)]).join(""),
    status: "verified",
  }));

export { teams };
