import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getConnection, getExplorerUrl } from "./escrow";
import { env } from "../config/env";
import { hasDeployedProgram } from "./verify";
import type { StatValidationProof } from "../services/txline/client";

const SETTLE_DISCRIMINATOR = Buffer.from([193, 153, 95, 216, 166, 6, 144, 217]);

export async function buildSettleMarketTx(params: {
  marketPda: string;
  authorityKeypair?: Keypair;
  proof: StatValidationProof;
}): Promise<{ signature: string; explorerUrl: string } | null> {
  if (!hasDeployedProgram() || !params.authorityKeypair) return null;

  try {
    const connection = getConnection();
    const programId = new PublicKey(env.worldcupProgramId);
    const market = new PublicKey(params.marketPda);
    const txoracle = new PublicKey(env.txoracleProgramId);

    const merkleRoot = hexToBytes32(params.proof.merkleRoot);
    const proofHash = hexToBytes32(params.proof.proofHash);

    const data = Buffer.concat([
      SETTLE_DISCRIMINATOR,
      proofHash,
      merkleRoot,
    ]);

    const settleIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: market, isSigner: false, isWritable: true },
        { pubkey: txoracle, isSigner: false, isWritable: false },
        { pubkey: params.authorityKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(settleIx);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = params.authorityKeypair.publicKey;
    tx.sign(params.authorityKeypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return { signature, explorerUrl: getExplorerUrl(signature) };
  } catch {
    return null;
  }
}

function hexToBytes32(hex: string): Buffer {
  const cleaned = hex.replace(/^0x/, "");
  const buf = Buffer.alloc(32);
  const src = Buffer.from(cleaned.padEnd(64, "0").slice(0, 64), "hex");
  src.copy(buf, Math.max(0, 32 - src.length));
  return buf;
}

export function loadSettlementAuthority(): Keypair | null {
  const secret = process.env.SETTLEMENT_AUTHORITY_SECRET;
  if (!secret) return null;
  try {
    const bytes = JSON.parse(secret) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}
