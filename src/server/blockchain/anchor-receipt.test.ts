import { describe, expect, it } from "vitest";
import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { memoTxValid } from "./anchor-receipt";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWBqeybbncbhKi");
const USER = new PublicKey("11111111111111111111111111111112");

function fakeTx(params: {
  memo: string;
  signer?: PublicKey;
  err?: unknown;
  logOnly?: boolean;
}): Parameters<typeof memoTxValid>[0] {
  const signer = params.signer ?? USER;
  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    data: Buffer.from(params.memo, "utf8"),
  });
  const msg = new TransactionMessage({
    payerKey: signer,
    recentBlockhash: "11111111111111111111111111111111",
    instructions: [ix],
  }).compileToV0Message();
  const vtx = new VersionedTransaction(msg);

  return {
    transaction: { message: vtx.message, signatures: [] },
    meta: {
      err: params.err ?? null,
      logMessages: params.logOnly
        ? ["Program log: Memo (len 4): \"nope\""]
        : [`Program log: Memo (len ${params.memo.length}): "${params.memo}"`],
      fee: 5000,
      preBalances: [],
      postBalances: [],
      innerInstructions: null,
      preTokenBalances: null,
      postTokenBalances: null,
      rewards: null,
      loadedAddresses: { writable: [], readonly: [] },
      computeUnitsConsumed: 0,
    },
  } as Parameters<typeof memoTxValid>[0];
}

describe("memoTxValid", () => {
  const prefix = "matchmind:poll:abc:home";

  it("accepts matching memo prefix in logs", () => {
    const tx = fakeTx({ memo: `${prefix}:${USER.toBase58()}` });
    expect(memoTxValid(tx, USER.toBase58(), prefix)).toBe(true);
  });

  it("rejects bare memo log without expected prefix", () => {
    const tx = fakeTx({ memo: "unrelated:memo:payload", logOnly: true });
    // instruction data also won't match
    expect(memoTxValid(tx, USER.toBase58(), prefix)).toBe(false);
  });

  it("rejects failed transactions", () => {
    const tx = fakeTx({ memo: `${prefix}:x`, err: { InstructionError: [0, "Custom"] } });
    expect(memoTxValid(tx, USER.toBase58(), prefix)).toBe(false);
  });

  it("rejects wrong signer", () => {
    const other = new PublicKey("11111111111111111111111111111113");
    const tx = fakeTx({ memo: `${prefix}:x`, signer: other });
    expect(memoTxValid(tx, USER.toBase58(), prefix)).toBe(false);
  });

  it("rejects empty expected prefix", () => {
    const tx = fakeTx({ memo: `${prefix}:x` });
    expect(memoTxValid(tx, USER.toBase58(), "")).toBe(false);
  });
});
