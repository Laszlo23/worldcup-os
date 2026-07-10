import type { LiveEvent } from "@/lib/queries/hooks";
import { normalizeLiveEventType, normalizeLiveEvents } from "@/lib/live-events";

/** Pipeline step index: 0 TxLINE → 1 Events → 2 Markets → 3 Predictions → 4 Solana → 5 Settlement */
export function pipelineStageFromEvent(event: Pick<LiveEvent, "event_type" | "payload">): number {
  const type = normalizeLiveEventType(event.event_type);
  const payload = event.payload ?? {};

  switch (type) {
    case "proof_verified":
    case "settlement":
      return 5;
    case "settlement_started":
    case "tx_confirmed":
      return 4;
    case "odds_update":
      return payload.predictionId ? 3 : 2;
    case "market_close":
      return 2;
    case "goal":
    case "kickoff_waiting":
      return 1;
    default:
      return 0;
  }
}

export function computePipelineIndex(
  events: LiveEvent[],
  opts?: { txlineConnected?: boolean; fixtureCount?: number },
): number {
  const normalized = normalizeLiveEvents(events);
  let max = opts?.txlineConnected ? 0 : -1;

  if ((opts?.fixtureCount ?? 0) > 0) {
    max = Math.max(max, 2);
  }

  for (const event of normalized) {
    max = Math.max(max, pipelineStageFromEvent(event));
  }

  if (normalized.length > 0) {
    max = Math.max(max, 1);
  }

  return Math.max(0, max);
}
