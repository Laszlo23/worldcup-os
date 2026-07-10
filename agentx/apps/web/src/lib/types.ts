export type Team = { name: string; flag?: string };

export type Match = {
  id: string;
  externalId: string;
  homeTeam: Team;
  awayTeam: Team;
  scoreHome: number;
  scoreAway: number;
  status: string;
  minute: number;
  stadium?: string;
  stage?: string;
  stats: Record<string, unknown>;
  odds: { home?: number; draw?: number; away?: number };
  oddsHistory: { t: number; home: number; draw: number; away: number }[];
  momentum: number;
  winProbability: { home?: number; draw?: number; away?: number };
};

export type Reasoning = { type: string; label: string; impact: string };

export type Signal = {
  id: string;
  matchId: string;
  type: string;
  headline: string;
  prediction: string;
  confidence: number;
  impact: string;
  reasoning: Reasoning[];
  metrics: Record<string, unknown>;
  expectedValue?: number;
  createdAt: string;
  homeTeam?: Team;
  awayTeam?: Team;
  scoreHome?: number;
  scoreAway?: number;
};

export type Agent = {
  id: string;
  name: string;
  strategy: string;
  balance: number;
  totalTrades: number;
  wins: number;
  losses: number;
  roi: number;
  riskScore: number;
  winRate: number;
  rank: number;
  treasuryPubkey?: string;
  treasuryBalance?: number;
  treasuryExplorer?: string;
  active?: boolean;
  minTreasury?: number;
  recentDecisions: { id: string; action: string; stake: number; outcome?: string; headline?: string; createdAt: string }[];
};

export type Performance = {
  balance: number;
  pnl: number;
  pnlPercent: number;
  winRate: number;
  totalTrades: number;
  equityCurve: { t: string; v: number }[];
  dailyPnl: { day: string; pnl: number }[];
  recentSignals: { id: string; market: string; prediction: string; result: string; roi?: number; confidence: number; txHash?: string }[];
};
