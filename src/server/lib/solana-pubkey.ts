import { PublicKey } from "@solana/web3.js";

export function isValidSolanaPubkey(value: string): boolean {
  try {
    const key = new PublicKey(value.trim());
    return PublicKey.isOnCurve(key.toBytes());
  } catch {
    return false;
  }
}
