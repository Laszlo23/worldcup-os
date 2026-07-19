import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { getConnection, getExplorerUrl } from "./escrow";
import { loadSettlementAuthority } from "./settlement";

/** SPL Memo v2 — missing on some Solana 4.x beta clusters. */
export const MEMO_PROGRAM_V2 = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWBqeybbncbhKi");
/** Legacy Memo — present on current Solana 4.2 beta.1 devnet. */
export const MEMO_PROGRAM_V1 = new PublicKey("Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo");

const MEMO_PROGRAM_IDS = [MEMO_PROGRAM_V2, MEMO_PROGRAM_V1] as const;

let cachedMemoProgramId: PublicKey | null = null;

function isMemoProgram(id: PublicKey | undefined | null): boolean {
  if (!id) return false;
  return MEMO_PROGRAM_IDS.some((m) => m.equals(id));
}

/** Pick a Memo program that actually exists on the configured cluster. */
export async function resolveMemoProgramId(
  connection: Connection = getConnection(),
): Promise<PublicKey> {
  if (cachedMemoProgramId) return cachedMemoProgramId;
  for (const id of MEMO_PROGRAM_IDS) {
    try {
      const info = await connection.getAccountInfo(id, "confirmed");
      if (info?.executable) {
        cachedMemoProgramId = id;
        return id;
      }
    } catch {
      // try next
    }
  }
  // Prefer V1 — known present on Solana 4.x beta.1 when V2 is absent.
  cachedMemoProgramId = MEMO_PROGRAM_V1;
  return MEMO_PROGRAM_V1;
}

export async function buildAnchorReceiptTx(params: {
  userPubkey: string;
  memo: string;
}): Promise<{ transaction: string; sponsored?: boolean; memoProgram?: string }> {
  const connection = getConnection();
  const user = new PublicKey(params.userPubkey);
  const memoProgram = await resolveMemoProgramId(connection);
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
      programId: memoProgram,
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
    memoProgram: memoProgram.toBase58(),
  };
}

function extractMemoTexts(
  tx: NonNullable<Awaited<ReturnType<Connection["getTransaction"]>>>,
): string[] {
  const texts: string[] = [];
  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  });

  try {
    for (const ix of message.compiledInstructions) {
      const programId = accountKeys.get(ix.programIdIndex);
      if (!isMemoProgram(programId)) continue;
      texts.push(Buffer.from(ix.data).toString("utf8"));
    }
  } catch {
    // ignore decode errors
  }

  return texts;
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
  const accountKeys = message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  });
  const staticKeys = accountKeys.staticAccountKeys;
  const signerIndex = staticKeys.findIndex((k) => k.toBase58() === userPubkey);
  // Must be an actual signer, not merely listed as a readonly account (e.g. gas drip recipient).
  if (signerIndex < 0 || signerIndex >= message.header.numRequiredSignatures) return false;

  // Instruction data is authoritative — Memo v1 does not echo memo text in logs.
  const memoTexts = extractMemoTexts(tx);
  if (memoTexts.some((text) => text.includes(expectedPrefix))) return true;

  // Fallback for Memo v2 style logs: Program log: Memo (len N): "..."
  const logs = tx.meta?.logMessages ?? [];
  if (logs.some((l) => l.includes(expectedPrefix))) return true;

  return false;
}

function parsedMemoText(ix: {
  programId?: PublicKey;
  parsed?: unknown;
  data?: string;
}): string | null {
  const programId = ix.programId?.toBase58?.() ?? "";
  if (!MEMO_PROGRAM_IDS.some((m) => m.toBase58() === programId)) return null;

  if (ix.parsed && typeof ix.parsed === "object" && ix.parsed !== null && "memo" in ix.parsed) {
    return String((ix.parsed as { memo: unknown }).memo ?? "");
  }

  if (typeof ix.data === "string" && ix.data.length > 0) {
    try {
      return Buffer.from(bs58.decode(ix.data)).toString("utf8");
    } catch {
      try {
        return Buffer.from(ix.data, "base64").toString("utf8");
      } catch {
        return ix.data;
      }
    }
  }
  return null;
}

export async function verifyMemoTx(params: {
  txSignature: string;
  userPubkey: string;
  expectedPrefix: string;
}): Promise<boolean> {
  const connection = getConnection();
  const delays = [0, 800, 1600, 3200, 5000];
  for (const delayMs of delays) {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

    const tx = await connection.getTransaction(params.txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (memoTxValid(tx, params.userPubkey, params.expectedPrefix)) return true;

    const parsed = await connection.getParsedTransaction(params.txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!parsed || parsed.meta?.err) continue;

    const signerOk = parsed.transaction.message.accountKeys.some(
      (k) => k.pubkey.toBase58() === params.userPubkey && k.signer,
    );
    if (!signerOk) continue;

    for (const ix of parsed.transaction.message.instructions) {
      const text = parsedMemoText(ix as { programId?: PublicKey; parsed?: unknown; data?: string });
      if (text?.includes(params.expectedPrefix)) return true;
    }
  }
  return false;
}

export { getExplorerUrl };
