import { apiFetch } from "../api/client";
import bs58 from "bs58";

export async function authenticateWallet(
  pubkey: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<{ balance: number }> {
  const nonceRes = await apiFetch<{ nonce: string; message: string }>(
    `/api/auth/nonce?pubkey=${encodeURIComponent(pubkey)}`,
  );
  if (!nonceRes.message?.includes(pubkey)) {
    throw new Error("Auth challenge mismatch — refresh and try again");
  }
  const messageBytes = new TextEncoder().encode(nonceRes.message);
  const signatureBytes = await signMessage(messageBytes);
  if (!(signatureBytes instanceof Uint8Array) || signatureBytes.length === 0) {
    throw new Error("Wallet did not return a signature — approve the login message and retry");
  }
  const signature = bs58.encode(signatureBytes);

  const res = await apiFetch<{ balance: number }>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ pubkey, signature, message: nonceRes.message }),
  });
  return { balance: res.balance };
}

export async function refreshWalletSession(): Promise<{ wallet: string; balance: number } | null> {
  try {
    return await apiFetch<{ wallet: string; balance: number }>("/api/auth/session");
  } catch {
    return null;
  }
}

export async function logoutWallet(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // cookie may already be cleared
  }
}
