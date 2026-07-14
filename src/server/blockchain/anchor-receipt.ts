import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getConnection, getExplorerUrl } from "./escrow";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWBqeybbncbhKi");

export async function buildAnchorReceiptTx(params: {
  userPubkey: string;
  memo: string;
}): Promise<{ transaction: string; explorerUrl?: string }> {
  const connection = getConnection();
  const user = new PublicKey(params.userPubkey);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    feePayer: user,
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

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return {
    transaction: Buffer.from(serialized).toString("base64"),
  };
}

function memoTxValid(
  tx: Awaited<ReturnType<Connection["getTransaction"]>>,
  userPubkey: string,
  expectedPrefix: string,
): boolean {
  if (!tx?.transaction) return false;

  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys().staticAccountKeys;
  const signerIndex = accountKeys.findIndex((k) => k.toBase58() === userPubkey);
  if (signerIndex < 0) return false;

  const logs = tx.meta?.logMessages ?? [];
  const memoLog = logs.find((l) => l.includes("Program log: Memo") || l.includes(expectedPrefix));
  return Boolean(memoLog);
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
