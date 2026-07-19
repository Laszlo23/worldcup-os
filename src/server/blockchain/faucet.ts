import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
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

/** Enough for memo claims + a few retries on devnet. */
export const SOL_GAS_DRIP = 0.05;
/** Top up when wallet is below this (covers ~fee + buffer). */
export const SOL_GAS_MIN = 0.02;
/** Small bonus attached to community task claims. */
export const SOL_TASK_BONUS = 0.012;
const SOL_FAUCET_COOLDOWN_MS = 60 * 60 * 1000;
const memorySolFaucetAt = new Map<string, number>();

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

export async function getSolBalance(pubkey: string): Promise<number> {
  const connection = getConnection();
  const lamports = await connection.getBalance(new PublicKey(pubkey));
  return lamports / LAMPORTS_PER_SOL;
}

async function getLastSolFaucetAt(userId: string): Promise<number | null> {
  if (!hasDatabase()) return null;
  const row = await maybeOne<{ created_at: string }>(
    `
      select created_at from transactions
      where user_id = $1 and type = 'faucet_sol' and status = 'confirmed'
      order by created_at desc
      limit 1
    `,
    [userId],
  );
  return row ? new Date(row.created_at).getTime() : null;
}

export async function dripDevnetSol(params: {
  userPubkey: string;
  userId?: string;
  amountSol?: number;
  reason?: string;
  /** Skip cooldown when balance is critically low (moment/stadium gas). */
  forceIfEmpty?: boolean;
}): Promise<{
  signature: string;
  explorerUrl: string;
  balance: number;
  amount: number;
  skipped?: boolean;
  reason?: string;
}> {
  if (env.solanaNetwork !== "devnet") {
    throw new Error("SOL faucet is only available on devnet");
  }

  const authority = loadSettlementAuthority();
  if (!authority) {
    throw new Error("Settlement authority not configured — cannot fund wallets");
  }

  const amount = params.amountSol ?? SOL_GAS_DRIP;
  if (amount <= 0 || amount > 0.25) {
    throw new Error("Invalid SOL faucet amount");
  }

  const connection = getConnection();
  const user = new PublicKey(params.userPubkey);
  const beforeLamports = await connection.getBalance(user);
  const beforeSol = beforeLamports / LAMPORTS_PER_SOL;

  if (beforeSol >= SOL_GAS_MIN) {
    return {
      signature: "",
      explorerUrl: "",
      balance: beforeSol,
      amount: 0,
      skipped: true,
      reason: "already_funded",
    };
  }

  // Gas ensure can bypass cooldown when the wallet still cannot pay fees.
  if (!params.forceIfEmpty) {
    const lastDb = params.userId ? await getLastSolFaucetAt(params.userId) : null;
    const lastMemory = memorySolFaucetAt.get(params.userPubkey) ?? null;
    const last = Math.max(lastDb ?? 0, lastMemory ?? 0) || null;
    if (last && Date.now() - last < SOL_FAUCET_COOLDOWN_MS) {
      const minsLeft = Math.ceil((SOL_FAUCET_COOLDOWN_MS - (Date.now() - last)) / 60_000);
      throw new Error(`SOL faucet cooldown — try again in ~${minsLeft}m`);
    }
  }

  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
  const authorityBal = await connection.getBalance(authority.publicKey);
  if (authorityBal < lamports + 10_000) {
    throw new Error("SOL faucet pool is empty — refill the settlement authority wallet");
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: user,
      lamports,
    }),
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = authority.publicKey;
  tx.sign(authority);

  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

  memorySolFaucetAt.set(params.userPubkey, Date.now());

  if (params.userId && hasDatabase()) {
    try {
      await query(
        `
          insert into transactions (user_id, type, status, signature, metadata)
          values ($1, 'faucet_sol', 'confirmed', $2, $3::jsonb)
        `,
        [
          params.userId,
          signature,
          JSON.stringify({
            amount,
            recipient: params.userPubkey,
            reason: params.reason ?? "gas",
          }),
        ],
      );
    } catch {
      // DB optional on devnet
    }
  }

  const balance = await getSolBalance(params.userPubkey);
  return {
    signature,
    explorerUrl: getExplorerUrl(signature),
    balance,
    amount,
  };
}

/** Top up gas if the wallet cannot pay memo fees. Never throws for skip cases. */
export async function ensureDevnetGas(params: {
  userPubkey: string;
  userId?: string;
  reason?: string;
}): Promise<{
  ok: boolean;
  dripped: boolean;
  amount: number;
  balance: number;
  signature?: string;
  explorerUrl?: string;
  error?: string;
}> {
  if (!isDevnetFaucetEnabled()) {
    return { ok: false, dripped: false, amount: 0, balance: 0, error: "faucet_disabled" };
  }
  try {
    const result = await dripDevnetSol({
      userPubkey: params.userPubkey,
      userId: params.userId,
      amountSol: SOL_GAS_DRIP,
      reason: params.reason ?? "ensure_gas",
      forceIfEmpty: true,
    });
    return {
      ok: true,
      dripped: !result.skipped && result.amount > 0,
      amount: result.amount,
      balance: result.balance,
      signature: result.signature || undefined,
      explorerUrl: result.explorerUrl || undefined,
    };
  } catch (err) {
    return {
      ok: false,
      dripped: false,
      amount: 0,
      balance: await getSolBalance(params.userPubkey).catch(() => 0),
      error: err instanceof Error ? err.message : "faucet_failed",
    };
  }
}

/** One-shot task bonus SOL (smaller drip; ignores “already funded” skip). */
export async function dripTaskSolBonus(params: {
  userPubkey: string;
  userId?: string;
  taskId: string;
}): Promise<{
  dripped: boolean;
  amount: number;
  balance: number;
  signature?: string;
  explorerUrl?: string;
  error?: string;
}> {
  if (!isDevnetFaucetEnabled()) {
    return { dripped: false, amount: 0, balance: 0, error: "faucet_disabled" };
  }
  try {
    const before = await getSolBalance(params.userPubkey);
    // Still give a tiny bonus even if funded, but cap total wallet size.
    if (before >= 0.15) {
      return { dripped: false, amount: 0, balance: before };
    }
    const authority = loadSettlementAuthority();
    if (!authority) return { dripped: false, amount: 0, balance: before, error: "no_authority" };

    const amount = SOL_TASK_BONUS;
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
    const connection = getConnection();
    const user = new PublicKey(params.userPubkey);
    const authorityBal = await connection.getBalance(authority.publicKey);
    if (authorityBal < lamports + 10_000) {
      return { dripped: false, amount: 0, balance: before, error: "pool_empty" };
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: user,
        lamports,
      }),
    );
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority.publicKey;
    tx.sign(authority);
    const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    if (params.userId && hasDatabase()) {
      try {
        await query(
          `
            insert into transactions (user_id, type, status, signature, metadata)
            values ($1, 'faucet_sol', 'confirmed', $2, $3::jsonb)
          `,
          [
            params.userId,
            signature,
            JSON.stringify({
              amount,
              recipient: params.userPubkey,
              reason: `task-${params.taskId}`,
            }),
          ],
        );
      } catch {
        /* optional */
      }
    }

    const balance = await getSolBalance(params.userPubkey);
    return {
      dripped: true,
      amount,
      balance,
      signature,
      explorerUrl: getExplorerUrl(signature),
    };
  } catch (err) {
    return {
      dripped: false,
      amount: 0,
      balance: 0,
      error: err instanceof Error ? err.message : "faucet_failed",
    };
  }
}
