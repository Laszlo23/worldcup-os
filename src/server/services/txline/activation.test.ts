import { describe, it, expect } from "vitest";
import { buildActivationMessage } from "./activation";

describe("txline activation", () => {
  it("builds activation message as txSig::jwt", () => {
    expect(buildActivationMessage("sig123", "jwt456")).toBe("sig123::jwt456");
  });
});
