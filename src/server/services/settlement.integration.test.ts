import { describe, it, expect } from "vitest";
import { parseStatValidationResponse } from "./txline/client";

describe("settlement integration", () => {
  it("requires merkle root from stat validation before verified status", () => {
    const proof = parseStatValidationResponse(99, 1, 1, {
      merkleRoot: "0xroot",
      proofHash: "0xhash",
      signature: "ed25519:abc",
      value: 1,
    });
    expect(proof.merkleRoot).toBeTruthy();
    expect(proof.proofHash).toBeTruthy();
  });
});
