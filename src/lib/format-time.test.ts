import { describe, it, expect } from "vitest";
import { formatCountdownMs } from "@/lib/format-time";

describe("formatCountdownMs", () => {
  it("formats sub-hour countdown", () => {
    expect(formatCountdownMs(125_000)).toBe("2:05");
  });

  it("formats multi-hour countdown", () => {
    expect(formatCountdownMs(3_661_000)).toBe("01:01:01");
  });

  it("formats day-long countdown", () => {
    expect(formatCountdownMs(90_061_000)).toBe("1d 01:01:01");
  });
});
