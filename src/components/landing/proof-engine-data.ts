import { DEMO_EVENT } from "./oracle-settlement-timeline-data";

export const PROOF_DEMO_EVENT = {
  ...DEMO_EVENT,
  player: "Mbappé",
  timestamp: "20:42:11",
  source: "official feed",
  solanaTx: "5Kp9…mX7q",
} as const;

export type ProofEngineStageId =
  | "live-event"
  | "raw-data"
  | "generating"
  | "verified"
  | "certificate";

export const PROOF_ENGINE_STAGES: { id: ProofEngineStageId; label: string }[] = [
  { id: "live-event", label: "Live Event" },
  { id: "raw-data", label: "Raw Data" },
  { id: "generating", label: "Generating Proof" },
  { id: "verified", label: "Verified" },
  { id: "certificate", label: "On-Chain Certificate" },
];

export const PROOF_VERIFICATION_CHECKS = [
  "Event happened",
  "Timestamp valid",
  "Match official",
  "Score updated",
] as const;

export const PROOF_REPLAY_TIMESTAMPS = [
  { at: "00:00", label: "Goal scored" },
  { at: "00:02", label: "TxLINE receives event" },
  { at: "00:05", label: "Oracle validates source" },
  { at: "00:08", label: "Proof generated" },
  { at: "00:12", label: "Merkle root created" },
  { at: "00:15", label: "Solana confirms" },
  { at: "00:20", label: "Certificate minted" },
] as const;

/** Last highlighted timestamp index per oracle timeline stage (6 stages). */
export const PROOF_REPLAY_TIMESTAMP_HIGHLIGHT = [0, 2, 3, 4, 5, 6] as const;

export const PROOF_ENGINE_STEP_MS = 2400;
