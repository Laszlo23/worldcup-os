import nacl from "tweetnacl";
import bs58 from "bs58";
import { env } from "../config/env";

export function authMessageDomain(): string {
  try {
    return new URL(env.appUrl).host;
  } catch {
    return env.farcasterDomain;
  }
}

export function verifyWalletSignature(pubkey: string, message: string, signature: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const pubkeyBytes = bs58.decode(pubkey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, pubkeyBytes);
  } catch {
    return false;
  }
}

export function buildAuthMessage(pubkey: string, nonce: string, domain?: string): string {
  const resolvedDomain = domain?.trim() || authMessageDomain();
  return `World Cup OS login\nDomain: ${resolvedDomain}\nWallet: ${pubkey}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
}

export function extractDomainFromAuthMessage(message: string): string | null {
  const match = message.match(/^Domain:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}
