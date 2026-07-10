import { describe, it, expect } from "vitest";
import { computePipelineIndex, pipelineStageFromEvent } from "@/lib/pipeline-stage";
import type { LiveEvent } from "@/lib/queries/hooks";

function event(type: string, payload?: Record<string, unknown>): LiveEvent {
  return {
    id: crypto.randomUUID(),
    event_type: type,
    title: type,
    body: "",
    created_at: new Date().toISOString(),
    payload: payload ?? null,
  };
}

describe("pipeline stage", () => {
  it("maps prediction escrow events to predictions step", () => {
    expect(pipelineStageFromEvent(event("odds_update", { predictionId: "pred_1" }))).toBe(3);
  });

  it("uses max stage across all events, not only the oldest", () => {
    const events = [
      event("goal", { seq: 1 }),
      event("odds_update", { predictionId: "pred_1" }),
      event("settlement_finished"),
    ];
    expect(computePipelineIndex(events, { txlineConnected: true })).toBe(5);
  });

  it("lights markets when fixtures are synced", () => {
    expect(computePipelineIndex([], { txlineConnected: true, fixtureCount: 12 })).toBe(2);
  });
});
