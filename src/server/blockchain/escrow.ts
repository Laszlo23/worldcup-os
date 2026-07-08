import { Connection, PublicKey, SystemProgram, Transaction, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getTxoracleConfig } from "@/lib/txoracle/config";
import { env } from "../config/env";

export function getConnection(): Connection {
  return new Connection(env.solanaRpcUrl, "confirmed");
}

export function getUsdcMint(): PublicKey {
  return new PublicKey(env.usdcMint);
}

const PLACEHOLDER_PROGRAM_ID = "Wcup111111111111111111111111111111111111111";

export function getWorldcupProgramId(): PublicKey {
  const id = env.worldcupProgramId || PLACEHOLDER_PROGRAM_ID;
  return new PublicKey(id);
}

/** Escrow vault authority PDA — seeds align with on-chain `claim` instruction. */
export function getEscrowPda(marketAccountPubkey: string, userPubkey: string): PublicKey {
  const programId = getWorldcupProgramId();
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), new PublicKey(marketAccountPubkey).toBuffer(), new PublicKey(userPubkey).toBuffer()],
    programId,
  );
  return pda;
}

/** Demo escrow before market accounts exist on-chain: stable seed from external market id. */
export function getEscrowPdaForExternalMarket(marketExternalId: string, userPubkey: string): PublicKey {
  const programId = getWorldcupProgramId();
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), Buffer.from(marketExternalId), new PublicKey(userPubkey).toBuffer()],
    programId,
  );
  return pda;
}

export async function buildPlacePredictionTx(params: {
  userPubkey: string;
  amount: number;
  marketExternalId: string;
}): Promise<{ transaction: string; escrowPda: string } | null> {
  try {
    const connection = getConnection();
    const user = new PublicKey(params.userPubkey);
    const mint = getUsdcMint();
    const userAta = getAssociatedTokenAddressSync(mint, user);
    const escrowPda = getEscrowPdaForExternalMarket(params.marketExternalId, params.userPubkey);
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowPda, true);

    const tx = new Transaction();
    const escrowInfo = await connection.getAccountInfo(escrowAta);
    if (!escrowInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(user, escrowAta, escrowPda, mint),
      );
    }

    const amountLamports = BigInt(Math.floor(params.amount * 1_000_000));
    tx.add(createTransferInstruction(userAta, escrowAta, user, amountLamports));

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = user;

    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    return {
      transaction: serialized.toString("base64"),
      escrowPda: escrowPda.toBase58(),
    };
  } catch {
    return null;
  }
}

export function getExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${env.solanaNetwork}`;
}

export const TXORACLE_PROGRAM_ID = getTxoracleConfig(env.solanaNetwork).programId;
export const TXL_TOKEN_MINT = getTxoracleConfig(env.solanaNetwork).txlTokenMint;
