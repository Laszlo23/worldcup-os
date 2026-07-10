import { describe, expect, it } from "vitest";
import { buildFeedEventKey } from "./feed-event-key";
import { dedupeOracleFeedEvents, feedEventKeyFromLiveEvent } from "./live-events";
import type { LiveEvent } from "./queries/hooks";

describe("feed event keys", () => {
  it("uses TxLINE seq for goals", () => {
    expect(
      buildFeedEventKey({
        eventType: "goal",
        matchId: "m1",
        payload: { seq: 796 },
        body: "Player · 65'",
      }),
    ).toBe("goal:m1:796");
  });

  it("dedupes duplicate goal rows", () => {
    const events: LiveEvent[] = [
      {
        id: "a",
        event_type: "goal",
        title: "Goal",
        body: "413676 · 65'",
        created_at: "2026-07-09T23:58:00Z",
        match_id: "m1",
        payload: { seq: 796 },
      },
      {
        id: "b",
        event_type: "goal",
        title: "Goal",
        body: "413676 · 65'",
        created_at: "2026-07-09T23:59:00Z",
        match_id: "m1",
        payload: { seq: 796 },
      },
    ];
    const deduped = dedupeOracleFeedEvents(events);
    expect(deduped).toHaveLength(1);
    expect(feedEventKeyFromLiveEvent(deduped[0]!)).toBe("goal:m1:796");
  });
});
