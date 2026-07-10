export type PipelineNode = {
  id: string;
  label: string;
  shortLabel: string;
};

export type TimelineStage = {
  id: string;
  pipelineThrough: number;
};

/** Horizontal / vertical pipeline strip labels */
export const ORACLE_PIPELINE_NODES: PipelineNode[] = [
  { id: "goal", label: "GOAL DETECTED", shortLabel: "Goal" },
  { id: "oracle", label: "TXLINE ORACLE RECEIVES EVENT", shortLabel: "Oracle" },
  { id: "proof", label: "CRYPTOGRAPHIC PROOF GENERATED", shortLabel: "Proof" },
  { id: "merkle", label: "MERKLE ROOT SIGNED", shortLabel: "Merkle" },
  { id: "contract", label: "SMART CONTRACT SETTLEMENT", shortLabel: "Contract" },
  { id: "payout", label: "WINNER RECEIVES USDC", shortLabel: "Payout" },
  { id: "certificate", label: "NFT CERTIFICATE MINTED", shortLabel: "Certificate" },
];

export const ORACLE_TIMELINE_STAGES: TimelineStage[] = [
  { id: "live-event", pipelineThrough: 1 },
  { id: "oracle-activation", pipelineThrough: 2 },
  { id: "proof-generation", pipelineThrough: 3 },
  { id: "signature", pipelineThrough: 4 },
  { id: "settlement", pipelineThrough: 5 },
  { id: "certificate", pipelineThrough: 6 },
];

export const TIMELINE_REPLAY_MS = 30_000;
export const TIMELINE_STEP_MS = TIMELINE_REPLAY_MS / ORACLE_TIMELINE_STAGES.length;

export const DEMO_EVENT = {
  home: "France",
  away: "Morocco",
  scoreHome: 1,
  scoreAway: 0,
  minute: 67,
  eventType: "Goal",
  eventId: "SL12-7F82A",
  signatureId: "SL12-A92F8",
  merkleRoot: "0x7f3a92c1…9c2e",
  merkleRootFull: "0x7f3a92c1a8b4e6d2f901c3b7e5a8d4f2c1b9e6a3d807f5c2e9b1a4d6f8c0e2",
  usdcAmount: 25,
  winnerWallet: "7x82…91A",
} as const;

export const ORACLE_TERMINAL_LINES = [
  "Receiving verified match data...",
  "✓ Event confirmed",
  "✓ Timestamp locked",
  "✓ Source validated",
] as const;
