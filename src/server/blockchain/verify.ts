import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getConnection, getUsdcMint, getEscrowPdaForExternalMarket } from "./escrow";
import { env } from "../config/env";

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

export function getTxoracleProgramId(): PublicKey {
  return new PublicKey(env.txoracleProgramId);
}

export function hasDeployedProgram(): boolean {
  return Boolean(env.worldcupProgramId && env.worldcupProgramId !== "Wcup111111111111111111111111111111111111111");
}
