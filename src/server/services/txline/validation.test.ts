import { describe, it, expect } from "vitest";
import { parseStatValidationResponse } from "./client";
import { verifyTxlineStatProof } from "./validation";

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

  it("parses TxLINE byte-array stat-validation payloads", () => {
    const proof = parseStatValidationResponse(18209181, 1, 1, {
      statToProve: { key: 1, value: 2, period: 0 },
      summary: { eventStatsSubTreeRoot: [1, 2, 3, 4, 5, 6, 7, 8] },
      statProof: [{ hash: [9, 10, 11, 12, 13, 14, 15, 16], isRightSibling: false }],
    });
    expect(proof.merkleRoot).toBe("0x0102030405060708");
    expect(proof.proofHash).toBe("0x090a0b0c0d0e0f10");
    expect(proof.signature).toContain("txline-stat:18209181");
    expect(verifyTxlineStatProof(proof)).toBe(true);
  });

  it("verifyTxlineStatProof rejects empty proof", () => {
    expect(verifyTxlineStatProof(null)).toBe(false);
    expect(verifyTxlineStatProof(parseStatValidationResponse(1, 0, 1, {}))).toBe(false);
  });

  it("verifyTxlineStatProof accepts well-formed proof", () => {
    const proof = parseStatValidationResponse(1, 0, 1, {
      merkleRoot: "0xabc123",
      proof_hash: "0xdef456",
      signature: "ed25519:valid_signature_here",
    });
    expect(verifyTxlineStatProof(proof)).toBe(true);
  });
});
