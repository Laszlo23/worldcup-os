import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getConnection, getExplorerUrl } from "./escrow";
import { loadSettlementAuthority } from "./settlement";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWBqeybbncbhKi");

export async function buildAnchorReceiptTx(params: {
  userPubkey: string;
  memo: string;
}): Promise<{ transaction: string; sponsored?: boolean }> {
  const connection = getConnection();
  const user = new PublicKey(params.userPubkey);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  // Prefer authority-sponsored fees so empty smart wallets can still claim on-chain.
  const authority = loadSettlementAuthority();
  let feePayer = user;
  let sponsored = false;
  if (authority) {
    const authorityLamports = await connection.getBalance(authority.publicKey);
    if (authorityLamports >= 20_000) {
      feePayer = authority.publicKey;
      sponsored = true;
    }
  }

  const tx = new Transaction({
    feePayer,
    blockhash,
    lastValidBlockHeight,
  });

  tx.add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: user, isSigner: true, isWritable: false }],
      data: Buffer.from(params.memo.slice(0, 566), "utf8"),
    }),
  );

  if (sponsored && authority) {
    tx.partialSign(authority);
  }

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return {
    transaction: Buffer.from(serialized).toString("base64"),
    sponsored,
  };
}

/** Exported for unit tests — memo must bind to the expected action string. */
export function memoTxValid(
  tx: Awaited<ReturnType<Connection["getTransaction"]>>,
  userPubkey: string,
  expectedPrefix: string,
): boolean {
  if (!tx?.transaction) return false;
  if (tx.meta?.err) return false;
  if (!expectedPrefix || expectedPrefix.length < 8) return false;

  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys();
  const staticKeys = accountKeys.staticAccountKeys;
  const signerIndex = staticKeys.findIndex((k) => k.toBase58() === userPubkey);
  if (signerIndex < 0) return false;

  // Require the action-specific prefix — never accept a bare "Program log: Memo".
  const logs = tx.meta?.logMessages ?? [];
  if (logs.some((l) => l.includes(expectedPrefix))) return true;

  // Fallback: decode Memo program instruction data (utf8).
  try {
    for (const ix of message.compiledInstructions) {
      const programId = accountKeys.get(ix.programIdIndex);
      if (!programId?.equals(MEMO_PROGRAM_ID)) continue;
      const text = Buffer.from(ix.data).toString("utf8");
      if (text.includes(expectedPrefix)) return true;
    }
  } catch {
    // ignore decode errors
  }
  return false;
}

export async function verifyMemoTx(params: {
  txSignature: string;
  userPubkey: string;
  expectedPrefix: string;
}): Promise<boolean> {
  const connection = getConnection();
  const delays = [0, 800, 1600, 3200];
  for (const delayMs of delays) {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    const tx = await connection.getTransaction(params.txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (memoTxValid(tx, params.userPubkey, params.expectedPrefix)) return true;
  }
  return false;
}

export { getExplorerUrl };
