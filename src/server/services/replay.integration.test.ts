import { describe, it, expect } from "vitest";
import { replayStartSchema } from "@/lib/validators/api";

describe("replay API", () => {
  it("validates replay start payload", () => {
    const parsed = replayStartSchema.safeParse({ fixtureId: 17952170, matchExternalId: "fx-17952170" });
    expect(parsed.success).toBe(true);
  });
});
