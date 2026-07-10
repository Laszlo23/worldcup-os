import { describe, it, expect } from "vitest";
import { buildActivationMessage } from "./activation";

describe("txline activation", () => {
  it("builds activation message as txSig:leagues:jwt", () => {
    expect(buildActivationMessage("sig123", "jwt456")).toBe("sig123::jwt456");
    expect(buildActivationMessage("sig123", "jwt456", [1, 2])).toBe("sig123:1,2:jwt456");
  });
});
