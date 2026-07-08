import type { LiveEvent } from "@/lib/queries/hooks";

export const MOCK_ORACLE_EVENTS: LiveEvent[] = [
  {
    id: "mock-1",
    event_type: "goal",
    title: "GOAL · Argentina 1–0 Brazil",
    body: "TxLINE stat validation seq 1842 · Messi 23'",
    created_at: new Date(Date.now() - 12_000).toISOString(),
  },
  {
    id: "mock-2",
    event_type: "odds_update",
    title: "MARKET ENGINE · Odds shift",
    body: "Winner market: ARG 2.10 → 1.85 · liquidity +$42k",
    created_at: new Date(Date.now() - 28_000).toISOString(),
  },
  {
    id: "mock-3",
    event_type: "goal",
    title: "GOAL · France 1–1 Germany",
    body: "TxLINE stat validation seq 901 · Mbappé 34'",
    created_at: new Date(Date.now() - 45_000).toISOString(),
  },
  {
    id: "mock-4",
    event_type: "market_close",
    title: "MARKET ENGINE · Auto-close",
    body: "Over 2.5 market closed 15m before kickoff · 1,284 positions locked",
    created_at: new Date(Date.now() - 62_000).toISOString(),
  },
  {
    id: "mock-5",
    event_type: "settlement",
    title: "SETTLEMENT · Solana escrow",
    body: "Match m7 settled · 342 winners · tx confirmed on devnet",
    created_at: new Date(Date.now() - 90_000).toISOString(),
  },
  {
    id: "mock-6",
    event_type: "proof_verified",
    title: "PROOF · Merkle root verified",
    body: "Oracle signature VALID · root 0x8f3a…c21d · proof hash on-chain",
    created_at: new Date(Date.now() - 120_000).toISOString(),
  },
];
