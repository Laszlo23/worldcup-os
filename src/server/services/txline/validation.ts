import type { StatValidationProof } from "./client";

/** Structural validation before accepting a TxLINE stat-validation proof. */
export function verifyTxlineStatProof(proof: StatValidationProof | null): boolean {
  if (!proof) return false;
  if (!proof.merkleRoot?.trim() || !proof.proofHash?.trim() || !proof.signature?.trim()) return false;
  if (proof.merkleRoot.length < 6 || proof.proofHash.length < 6) return false;
  if (proof.signature.length < 8) return false;
  return true;
}
