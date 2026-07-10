import { describe, it, expect } from "vitest";
import { isMatchFeatured, selectFeaturedMatches } from "@/lib/match-phase";
import type { Match } from "@/lib/mock/types";

function match(status: Match["status"], kickoff: number): Pick<Match, "status" | "kickoff"> {
  return { status, kickoff };
}

describe("featured matches", () => {
  const now = 1_000_000;

  it("excludes finished fixtures from featured selection", () => {
    const rows = selectFeaturedMatches(
      [
        match("finished", now - 90 * 60_000),
        match("scheduled", now + 3 * 3600_000),
        match("live", now - 30 * 60_000),
      ],
      3,
      now,
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((m) => isMatchFeatured(m, now))).toBe(true);
    expect(rows[0]?.status).toBe("live");
  });
});
