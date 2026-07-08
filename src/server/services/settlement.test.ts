import { describe, it, expect } from "vitest";
import { resolveMarketOutcome, resolveWinnerOutcome } from "./txline/adapters";

describe("settlement resolution", () => {
  it("resolves correct score", () => {
    expect(resolveMarketOutcome("correct_score", "2 – 1", 2, 1)).toBe(true);
    expect(resolveMarketOutcome("correct_score", "1 – 1", 2, 1)).toBe(false);
  });

  it("resolves winner by team name", () => {
    expect(resolveWinnerOutcome("Argentina", "Brazil", "Argentina", 2, 0)).toBe(true);
    expect(resolveWinnerOutcome("Argentina", "Brazil", "Brazil", 0, 2)).toBe(true);
  });
});
