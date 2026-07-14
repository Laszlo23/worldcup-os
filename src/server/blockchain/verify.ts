import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getConnection, getUsdcMint, getEscrowPdaForExternalMarket } from "./escrow";
import { loadSettlementAuthority } from "./settlement";
import { env } from "../config/env";

const VERIFY_RETRIES = 8;
const VERIFY_DELAY_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchParsedTx(
  connection: Connection,
  signature: string,
): Promise<ParsedTransactionWithMeta | null> {
  return connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
}

export type EscrowVerification = {
  ok: boolean;
  reason?: string;
  amount?: number;
  escrowPda?: string;
};

export async function verifyPlacePredictionTx(params: {
  txSignature: string;
  userPubkey: string;
  marketExternalId: string;
  expectedAmount: number;
}): Promise<EscrowVerification> {
  try {
    const connection = getConnection();
    let tx: ParsedTransactionWithMeta | null = null;

    for (let attempt = 0; attempt < VERIFY_RETRIES; attempt++) {
      tx = await fetchParsedTx(connection, params.txSignature);
      if (tx) break;
      if (attempt < VERIFY_RETRIES - 1) await sleep(VERIFY_DELAY_MS);
    }

    if (!tx) {
      return { ok: false, reason: "transaction_not_found_or_failed" };
    }
    if (tx.meta?.err) {
      return { ok: false, reason: "transaction_failed_on_chain" };
    }

    const user = new PublicKey(params.userPubkey);
    const mint = getUsdcMint();
    const userAta = getAssociatedTokenAddressSync(mint, user);
    const escrowPda = getEscrowPdaForExternalMarket(params.marketExternalId, params.userPubkey);
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowPda, true);
    const expectedLamports = BigInt(Math.floor(params.expectedAmount * 1_000_000));

    const transfer = findTokenTransfer(tx, userAta.toBase58(), escrowAta.toBase58());
    if (!transfer) {
      return { ok: false, reason: "escrow_transfer_not_found" };
    }
    if (transfer.amount < expectedLamports) {
      return { ok: false, reason: "insufficient_escrow_amount" };
    }

    return {
      ok: true,
      amount: Number(transfer.amount) / 1_000_000,
      escrowPda: escrowPda.toBase58(),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "verification_failed" };
  }
}

function findTokenTransfer(
  tx: ParsedTransactionWithMeta,
  source: string,
  destination: string,
): { amount: bigint } | null {
  const instructions = [
    ...(tx.transaction.message.instructions ?? []),
    ...(tx.meta?.innerInstructions?.flatMap((ii) => ii.instructions) ?? []),
  ];

  for (const ix of instructions) {
    if (!("parsed" in ix) || !ix.parsed) continue;
    const parsed = ix.parsed as { type?: string; info?: Record<string, unknown> };
    if (parsed.type !== "transfer" && parsed.type !== "transferChecked") continue;
    const info = parsed.info ?? {};
    if (info.source === source && info.destination === destination) {
      const amount = BigInt(String(info.amount ?? info.tokenAmount?.amount ?? 0));
      return { amount };
    }
  }
  return null;
}

export async function simulateSettlementTx(signature: string): Promise<boolean> {
  try {
    const connection = getConnection();
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    return Boolean(tx && !tx.meta?.err);
  } catch {
    return false;
  }
}

export async function verifyClaimPayoutTx(params: {
  txSignature: string;
  userPubkey: string;
  expectedAmount: number;
}): Promise<{ ok: boolean; reason?: string }> {
  try {
    const connection = getConnection();
    const tx = await connection.getParsedTransaction(params.txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx || tx.meta?.err) {
      return { ok: false, reason: "transaction_not_found_or_failed" };
    }

    const user = new PublicKey(params.userPubkey);
    const mint = getUsdcMint();
    const userAta = getAssociatedTokenAddressSync(mint, user);
    const authority = loadSettlementAuthority();
    if (!authority) {
      return { ok: false, reason: "settlement_authority_missing" };
    }
    const authorityAta = getAssociatedTokenAddressSync(mint, authority.publicKey);
    const expectedLamports = BigInt(Math.floor(params.expectedAmount * 1_000_000));

    const transfer = findTokenTransfer(tx, authorityAta.toBase58(), userAta.toBase58());
    if (!transfer) {
      return { ok: false, reason: "payout_transfer_not_found" };
    }
    if (transfer.amount !== expectedLamports) {
      return { ok: false, reason: "payout_amount_mismatch" };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "verification_failed" };
  }
}

export function getTxoracleProgramId(): PublicKey {
  return new PublicKey(env.txoracleProgramId);
}

export function hasDeployedProgram(): boolean {
  return Boolean(env.worldcupProgramId && env.worldcupProgramId !== "Wcup111111111111111111111111111111111111111");
}
