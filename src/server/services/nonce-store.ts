import { hasDatabase } from "../config/env";
import { maybeOne, query } from "../db/postgres";

const memoryNonces = new Map<string, { wallet: string; expiresAt: number; used: boolean }>();
let preferMemoryNonces = false;

const NONCE_TTL_MS = 5 * 60_000;

export async function createNonce(walletPubkey: string): Promise<string> {
  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + NONCE_TTL_MS;

  if (hasDatabase() && !preferMemoryNonces) {
    try {
      await query("insert into auth_nonces (wallet_pubkey, nonce, expires_at) values ($1, $2, $3)", [
        walletPubkey,
        nonce,
        new Date(expiresAt).toISOString(),
      ]);
      return nonce;
    } catch {
      preferMemoryNonces = true;
    }
  }

  memoryNonces.set(nonce, { wallet: walletPubkey, expiresAt, used: false });
  return nonce;
}

export async function consumeNonce(walletPubkey: string, nonce: string): Promise<boolean> {
  if (hasDatabase() && !preferMemoryNonces) {
    try {
      const data = await maybeOne<{ id: string }>(
        `
          select id
          from auth_nonces
          where nonce = $1
            and wallet_pubkey = $2
            and used = false
            and expires_at > $3
        `,
        [nonce, walletPubkey, new Date().toISOString()],
      );

      if (data) {
        await query("update auth_nonces set used = true where id = $1", [data.id]);
        return true;
      }
    } catch {
      preferMemoryNonces = true;
    }
  }

  const entry = memoryNonces.get(nonce);
  if (!entry || entry.used || entry.wallet !== walletPubkey || Date.now() > entry.expiresAt) {
    return false;
  }
  entry.used = true;
  return true;
}

export function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce:\s*([^\n]+)/);
  return match?.[1]?.trim() ?? null;
}
