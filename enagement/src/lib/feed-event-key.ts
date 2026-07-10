/** Stable idempotency key for oracle feed rows — one broadcast per real-world event. */
export function buildFeedEventKey(params: {
  eventType: string;
  matchId?: string | null;
  payload?: Record<string, unknown> | null;
  body?: string | null;
  id?: string;
}): string {
  const type = params.eventType;
  const match = params.matchId ?? "global";
  const payload = params.payload ?? {};
  const seq = payload.seq ?? payload.Seq;

  if (type === "goal") {
    if (seq != null && String(seq) !== "") return `goal:${match}:${seq}`;
    const minute = payload.minute ?? payload.Minute;
    const player = payload.player ?? payload.PlayerId;
    if (minute != null || player != null) return `goal:${match}:${minute}:${player}`;
    return `goal:${match}:${params.body ?? params.id ?? ""}`;
  }

  if (type === "settlement_started" || type === "settlement_finished" || type === "proof_verified") {
    return `${type}:${match}`;
  }

  if (type === "tx_confirmed" && payload.solanaTx) {
    return `tx:${payload.solanaTx}`;
  }

  return `${type}:${match}:${params.body ?? params.id ?? ""}`;
}

export function isToastableFeedEvent(eventType: string): boolean {
  return eventType === "goal" || eventType === "settlement_finished" || eventType === "proof_verified";
}
