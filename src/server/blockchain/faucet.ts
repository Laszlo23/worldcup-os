import { PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import { getConnection, getExplorerUrl, getUsdcMint } from "./escrow";
import { loadSettlementAuthority } from "./settlement";
import { env, hasDatabase } from "../config/env";
import { getUsdcBalance } from "../services/auth";
import { maybeOne, query } from "../db/postgres";

const FAUCET_AMOUNT = 100;
const FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const memoryFaucetAt = new Map<string, number>();

export function isDevnetFaucetEnabled(): boolean {
  return env.solanaNetwork === "devnet" && Boolean(loadSettlementAuthority());
}

export async function getLastFaucetAt(userId: string): Promise<number | null> {
  if (!hasDatabase()) return null;
  const row = await maybeOne<{ created_at: string }>(
    `
      select created_at from transactions
      where user_id = $1 and type = 'faucet_usdc' and status = 'confirmed'
      order by created_at desc
      limit 1
    `,
    [userId],
  );
  return row ? new Date(row.created_at).getTime() : null;
}

export async function dripDevnetUsdc(params: {
  userPubkey: string;
  userId?: string;
  amount?: number;
}): Promise<{ signature: string; explorerUrl: string; balance: number; amount: number }> {
  if (env.solanaNetwork !== "devnet") {
    throw new Error("USDC faucet is only available on devnet");
  }

  const authority = loadSettlementAuthority();
  if (!authority) {
    throw new Error("Settlement authority not configured — contact the team for test USDC");
  }

  const lastDb = params.userId ? await getLastFaucetAt(params.userId) : null;
  const lastMemory = memoryFaucetAt.get(params.userPubkey) ?? null;
  const last = Math.max(lastDb ?? 0, lastMemory ?? 0) || null;
  if (last && Date.now() - last < FAUCET_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((FAUCET_COOLDOWN_MS - (Date.now() - last)) / 3_600_000);
    throw new Error(`Faucet cooldown active — try again in ~${hoursLeft}h`);
  }

  const amount = params.amount ?? FAUCET_AMOUNT;
  if (amount <= 0 || amount > 500) {
    throw new Error("Invalid faucet amount");
  }

  const connection = getConnection();
  const mint = getUsdcMint();
  const user = new PublicKey(params.userPubkey);
  const userAta = getAssociatedTokenAddressSync(mint, user);
  const authorityAta = getAssociatedTokenAddressSync(mint, authority.publicKey);
  const amountLamports = BigInt(Math.floor(amount * 1_000_000));

  const pool = await getAccount(connection, authorityAta).catch(() => null);
  if (!pool || pool.amount < amountLamports) {
    throw new Error("Faucet pool is empty — ping the team to refill devnet USDC");
  }

  const tx = new Transaction();
  const userAtaInfo = await connection.getAccountInfo(userAta);
  if (!userAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(authority.publicKey, userAta, user, mint));
  }
  tx.add(createTransferInstruction(authorityAta, userAta, authority.publicKey, amountLamports));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = authority.publicKey;
  tx.sign(authority);

  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

  memoryFaucetAt.set(params.userPubkey, Date.now());

  if (params.userId && hasDatabase()) {
    try {
      await query(
        `
          insert into transactions (user_id, type, status, signature, metadata)
          values ($1, 'faucet_usdc', 'confirmed', $2, $3::jsonb)
        `,
        [params.userId, signature, JSON.stringify({ amount, recipient: params.userPubkey })],
      );
    } catch {
      // DB optional on devnet — in-memory cooldown still applies
    }
  }

  const balance = await getUsdcBalance(params.userPubkey);
  return {
    signature,
    explorerUrl: getExplorerUrl(signature),
    balance,
    amount,
  };
}

export async function transferDevnetUsdcDirect(params: {
  recipientPubkey: string;
  amount: number;
}): Promise<{ signature: string; explorerUrl: string; balance: number }> {
  if (env.solanaNetwork !== "devnet") throw new Error("Only supported on devnet");
  const authority = loadSettlementAuthority();
  if (!authority) throw new Error("Settlement authority not configured");

  const connection = getConnection();
  const mint = getUsdcMint();
  const user = new PublicKey(params.recipientPubkey);
  const userAta = getAssociatedTokenAddressSync(mint, user);
  const authorityAta = getAssociatedTokenAddressSync(mint, authority.publicKey);
  const amountLamports = BigInt(Math.floor(params.amount * 1_000_000));

  const tx = new Transaction();
  if (!(await connection.getAccountInfo(userAta))) {
    tx.add(createAssociatedTokenAccountInstruction(authority.publicKey, userAta, user, mint));
  }
  tx.add(createTransferInstruction(authorityAta, userAta, authority.publicKey, amountLamports));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = authority.publicKey;
  tx.sign(authority);

  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

  const balance = await getUsdcBalance(params.recipientPubkey);
  return { signature, explorerUrl: getExplorerUrl(signature), balance };
}

export async function getFaucetPoolBalance(): Promise<number> {
  const authority = loadSettlementAuthority();
  if (!authority) return 0;
  try {
    return await getUsdcBalance(authority.publicKey.toBase58());
  } catch {
    return 0;
  }
}
