import type { LiveEvent } from "@/lib/queries/hooks";
import { buildFeedEventKey } from "./feed-event-key";

/** Normalize DB event_type strings for consistent UI icons/labels. */
export function normalizeLiveEventType(type: string): string {
  switch (type) {
    case "market_closing":
      return "market_close";
    case "settlement_finished":
      return "settlement";
    default:
      return type;
  }
}

export function normalizeLiveEvents(events: LiveEvent[]): LiveEvent[] {
  return dedupeOracleFeedEvents(
    events.map((e) => ({
      ...e,
      event_type: normalizeLiveEventType(e.event_type),
    })),
  );
}

/** One row per logical oracle event (goal seq, settlement per match, etc.). */
export function dedupeOracleFeedEvents(events: LiveEvent[]): LiveEvent[] {
  const seen = new Set<string>();
  const out: LiveEvent[] = [];
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const event of sorted) {
    const key = feedEventKeyFromLiveEvent(event);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(event);
  }
  return out;
}

export function feedEventKeyFromLiveEvent(event: Pick<LiveEvent, "id" | "event_type" | "body" | "match_id" | "payload">): string {
  return buildFeedEventKey({
    eventType: event.event_type,
    matchId: event.match_id,
    payload: event.payload,
    body: event.body,
    id: event.id,
  });
}

export function liveEventLabel(type: string): string {
  switch (normalizeLiveEventType(type)) {
    case "goal":
      return "Goal";
    case "odds_update":
      return "Odds";
    case "market_close":
      return "Market lock";
    case "settlement":
      return "Settled";
    case "settlement_started":
      return "Full time";
    case "kickoff_waiting":
      return "Kickoff";
    case "proof_verified":
      return "Proof";
    case "tx_confirmed":
      return "On-chain";
    default:
      return "Feed";
  }
}
