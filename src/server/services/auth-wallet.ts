import nacl from "tweetnacl";
import bs58 from "bs58";

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

export function buildAuthMessage(pubkey: string, nonce: string): string {
  return `World Cup OS login\nWallet: ${pubkey}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
}
