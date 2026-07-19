import { describe, expect, it } from "vitest";
import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { memoTxValid, MEMO_PROGRAM_V1, MEMO_PROGRAM_V2 } from "./anchor-receipt";

const USER = new PublicKey("11111111111111111111111111111112");

function fakeTx(params: {
  memo: string;
  signer?: PublicKey;
  err?: unknown;
  memoProgram?: PublicKey;
  /** When true, only put a bare Memo log (no matching prefix) — should fail. */
  bareMemoLog?: boolean;
  /** Extra readonly account that is not a signer. */
  readonlyExtra?: PublicKey;
}): Parameters<typeof memoTxValid>[0] {
  const signer = params.signer ?? USER;
  const memoProgram = params.memoProgram ?? MEMO_PROGRAM_V1;
  const ix = new TransactionInstruction({
    programId: memoProgram,
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    data: Buffer.from(params.memo, "utf8"),
  });
  const msg = new TransactionMessage({
    payerKey: signer,
    recentBlockhash: "11111111111111111111111111111111",
    instructions: [ix],
  }).compileToV0Message();
  const vtx = new VersionedTransaction(msg);

  const logMessages = params.bareMemoLog
    ? ['Program log: Memo (len 4): "nope"']
    : params.memoProgram?.equals(MEMO_PROGRAM_V2)
      ? [`Program log: Memo (len ${params.memo.length}): "${params.memo}"`]
      : [
          `Program ${memoProgram.toBase58()} invoke [1]`,
          `Program ${memoProgram.toBase58()} success`,
        ];

  return {
    transaction: { message: vtx.message, signatures: [] },
    meta: {
      err: params.err ?? null,
      logMessages,
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

  it("accepts Memo v1 instruction data with matching prefix (no log echo)", () => {
    const tx = fakeTx({ memo: `${prefix}:${USER.toBase58()}`, memoProgram: MEMO_PROGRAM_V1 });
    expect(memoTxValid(tx, USER.toBase58(), prefix)).toBe(true);
  });

  it("accepts Memo v2 with matching log prefix", () => {
    const tx = fakeTx({ memo: `${prefix}:${USER.toBase58()}`, memoProgram: MEMO_PROGRAM_V2 });
    expect(memoTxValid(tx, USER.toBase58(), prefix)).toBe(true);
  });

  it("rejects bare memo log without expected prefix when ix also mismatches", () => {
    const tx = fakeTx({ memo: "unrelated:memo:payload", bareMemoLog: true });
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

  it("rejects gas-drip style txs where user is only a readonly recipient", () => {
    // Build a system-transfer shaped message: authority signs, user is destination only.
    const authority = new PublicKey("11111111111111111111111111111113");
    const ix = new TransactionInstruction({
      programId: new PublicKey("11111111111111111111111111111111"),
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: USER, isSigner: false, isWritable: true },
      ],
      data: Buffer.from([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    });
    const msg = new TransactionMessage({
      payerKey: authority,
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [ix],
    }).compileToV0Message();
    const vtx = new VersionedTransaction(msg);
    const tx = {
      transaction: { message: vtx.message, signatures: [] },
      meta: {
        err: null,
        logMessages: ["Program 11111111111111111111111111111111 success"],
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

    expect(memoTxValid(tx, USER.toBase58(), prefix)).toBe(false);
  });
});
