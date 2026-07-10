// Normalized types aligned with the TxLINE JSON schema.
// When integrating TxLINE, replace the mock provider in src/lib/mock/provider.ts
// with SSE subscriptions to the TxLINE feed — these interfaces stay the same.

export type MatchStatus = "scheduled" | "live" | "halftime" | "finished" | "settled";

export interface Team {
  id: string;
  name: string;
  code: string; // 3-letter code
  flag: string; // emoji
  color: string;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: "goal" | "yellow" | "red" | "corner" | "penalty" | "var" | "sub";
  teamId: string;
  player?: string;
  detail?: string;
}

export interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  xg: [number, number];
  corners: [number, number];
  fouls: [number, number];
}

export interface Odds {
  home: number;
  draw: number;
  away: number;
  updatedAt: number;
}

export interface Match {
  id: string;
  home: Team;
  away: Team;
  scoreHome: number;
  scoreAway: number;
  status: MatchStatus;
  minute: number;
  stadium: string;
  stage: string;
  kickoff: number;
  events: MatchEvent[];
  stats: MatchStats;
  odds: Odds;
  oddsHistory: { t: number; home: number; draw: number; away: number }[];
  /** True when a TxLINE-verified proof exists for this match (not demo seed). */
  hasVerifiedProof?: boolean;
}

export type MarketType =
  | "winner"
  | "over_2_5"
  | "first_scorer"
  | "btts"
  | "correct_score";

export interface MarketOutcome {
  id: string;
  label: string;
  price: number; // decimal odds
  liquidity: number;
  participants: number;
}

export interface Market {
  id: string;
  matchId: string;
  type: MarketType;
  title: string;
  outcomes: MarketOutcome[];
  totalLiquidity: number;
  closed: boolean;
}

export interface Prediction {
  id: string;
  marketId: string;
  matchId: string;
  outcomeId: string;
  outcomeLabel: string;
  amount: number; // USDC
  price: number;
  placedAt: number;
  status: "open" | "won" | "lost" | "settled";
  payout?: number;
  claimed?: boolean;
}

export interface TxLineProof {
  matchId: string;
  finalScore: [number, number];
  merkleRoot: string;
  proofHash: string;
  signature: string;
  validatedAt: number;
  solanaTx: string;
  status: "verified" | "pending";
}

/** Indexed on-chain escrow lock from a confirmed place-prediction transaction. */
export interface EscrowProof {
  id: string;
  matchId: string;
  outcomeLabel: string;
  amount: number;
  price: number;
  status: "open" | "won" | "lost" | "settled";
  txSignature: string;
  escrowPda: string | null;
  placedAt: number;
  explorerUrl: string;
}

export interface LeaderRow {
  rank: number;
  address: string;
  avatar: string;
  profit: number;
  winRate: number;
  correct: number;
  streak: number;
  biggestWin: number;
}
