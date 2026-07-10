import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getConnection, getWorldcupProgramId } from "./escrow";
import { loadSettlementAuthority } from "./settlement";
import { hasDeployedProgram } from "./verify";

const INIT_MARKET_DISCRIMINATOR = Buffer.from([35, 35, 189, 193, 155, 48, 170, 203]);

function encodeBorshString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

/** Create on-chain Market account and return its pubkey (best-effort; null on failure). */
export async function initializeMarketOnChain(params: {
  matchExternalId: string;
  marketType: string;
}): Promise<string | null> {
  if (!hasDeployedProgram()) return null;
  const authority = loadSettlementAuthority();
  if (!authority) return null;

  try {
    const connection = getConnection();
    const programId = getWorldcupProgramId();
    const marketKeypair = Keypair.generate();

    const data = Buffer.concat([
      INIT_MARKET_DISCRIMINATOR,
      encodeBorshString(params.matchExternalId),
      encodeBorshString(params.marketType),
    ]);

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: marketKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority.publicKey;
    tx.sign(authority, marketKeypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return marketKeypair.publicKey.toBase58();
  } catch (err) {
    console.warn("[initializeMarketOnChain]", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function initializeMarketIfConfigured(params: {
  matchExternalId: string;
  marketType: string;
  marketUuid: string;
}): Promise<void> {
  const pda = await initializeMarketOnChain({
    matchExternalId: params.matchExternalId,
    marketType: params.marketType,
  });
  if (!pda) return;

  const { query } = await import("../db/postgres");
  await query("update markets set on_chain_market_pda = $1, updated_at = now() where id = $2", [
    pda,
    params.marketUuid,
  ]);
}
