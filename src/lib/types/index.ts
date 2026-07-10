// Domain types aligned with TxLINE JSON schema.
export type {
  MatchStatus,
  Team,
  MatchEvent,
  MatchStats,
  Odds,
  Match,
  MarketType,
  MarketOutcome,
  Market,
  Prediction,
  TxLineProof,
  EscrowProof,
  LeaderRow,
} from "../mock/types";

export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

export type NotificationType =
  | "prediction_won"
  | "prediction_lost"
  | "goal"
  | "odds_change"
  | "market_closing"
  | "settlement"
  | "reward_claimed"
  | "wallet_connected";

export type LiveEventType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "penalty"
  | "var"
  | "corner"
  | "odds_update"
  | "settlement_started"
  | "settlement_finished"
  | "proof_verified"
  | "tx_confirmed"
  | "market_closing";

export interface AnalyticsSnapshot {
  volume: { date: string; value: number }[];
  users: { date: string; value: number }[];
  liquidity: { date: string; value: number }[];
  settlements: { date: string; value: number }[];
  oddsMove: { t: number; home: number; draw: number; away: number }[];
  totals: {
    tvl: number;
    volumeToday: number;
    predictions: number;
    markets: number;
    liveMatches: number;
    users: number;
    transactions: number;
  };
}

export interface PortfolioSummary {
  balance: number;
  inEscrow: number;
  pendingRewards: number;
  totalEarnings: number;
  roi: number;
  accuracy: number;
  performance: { d: string; v: number }[];
  open: import("../mock/types").Prediction[];
  won: import("../mock/types").Prediction[];
  lost: import("../mock/types").Prediction[];
  settled: import("../mock/types").Prediction[];
}

export interface AdminDashboard {
  users: number;
  matches: number;
  markets: number;
  settlements: number;
  proofs: number;
  transactions: number;
  txlineStatus: "healthy" | "degraded" | "down";
  workerStatus: Record<string, { status: string; lastRun: string | null }>;
  recentJobs: { id: string; type: string; status: string; lastError: string | null; createdAt: string }[];
}

export interface ReplaySession {
  matchId: string;
  fixtureId: number;
  durationMs: number;
  events: { atMs: number; payload: unknown }[];
}
