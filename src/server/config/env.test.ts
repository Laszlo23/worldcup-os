import { describe, it, expect } from "vitest";

function shouldUseMockFallback(requireLiveData: boolean, hasDb: boolean): boolean {
  if (requireLiveData) return false;
  return !hasDb;
}

describe("live data gating", () => {
  it("allows mock fallback when REQUIRE_LIVE_DATA is false and no db", () => {
    expect(shouldUseMockFallback(false, false)).toBe(true);
  });

  it("disables mock fallback when REQUIRE_LIVE_DATA is true", () => {
    expect(shouldUseMockFallback(true, false)).toBe(false);
  });
});
