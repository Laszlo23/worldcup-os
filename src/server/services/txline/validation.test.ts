import { describe, it, expect } from "vitest";
import { parseStatValidationResponse } from "./client";

describe("txline stat validation", () => {
  it("parses stat-validation response fields", () => {
    const proof = parseStatValidationResponse(123, 0, 1, {
      value: 2,
      merkleRoot: "0xabc",
      proof_hash: "0xdef",
      signature: "sig",
    });
    expect(proof.merkleRoot).toBe("0xabc");
    expect(proof.proofHash).toBe("0xdef");
    expect(proof.value).toBe(2);
    expect(proof.signature).toBe("sig");
  });
});
