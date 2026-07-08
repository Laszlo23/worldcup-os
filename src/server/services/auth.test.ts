import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { verifyWalletSignature, buildAuthMessage } from "./auth-wallet";

describe("wallet auth", () => {
  it("verifies ed25519 signatures", () => {
    const keypair = nacl.sign.keyPair();
    const pubkey = bs58.encode(keypair.publicKey);
    const message = buildAuthMessage(pubkey, "nonce-123");
    const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey));
    expect(verifyWalletSignature(pubkey, message, signature)).toBe(true);
    expect(verifyWalletSignature(pubkey, message + "tampered", signature)).toBe(false);
  });
});
