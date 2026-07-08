import { describe, it, expect } from "vitest";
import { extractNonceFromMessage } from "./nonce-store";
import { buildAuthMessage } from "./auth-wallet";

describe("nonce store", () => {
  it("extracts nonce from auth message", () => {
    const message = buildAuthMessage("wallet123", "nonce-abc");
    expect(extractNonceFromMessage(message)).toBe("nonce-abc");
  });
});
