import { apiFetch } from "../api/client";
import bs58 from "bs58";

export async function authenticateWallet(
  pubkey: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<{ balance: number }> {
  const nonceRes = await apiFetch<{ nonce: string; message: string }>(
    `/api/auth/nonce?pubkey=${encodeURIComponent(pubkey)}`,
  );
  const messageBytes = new TextEncoder().encode(nonceRes.message);
  const signatureBytes = await signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  const res = await apiFetch<{ balance: number }>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ pubkey, signature, message: nonceRes.message }),
  });
  return { balance: res.balance };
}

export async function logoutWallet(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
