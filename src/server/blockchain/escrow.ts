import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import { getTxoracleConfig } from "@/lib/txoracle/config";
import { env } from "../config/env";
import { loadSettlementAuthority } from "./settlement";

export function getConnection(): Connection {
  return new Connection(env.solanaRpcUrl, "confirmed");
}

export function getUsdcMint(): PublicKey {
  return new PublicKey(env.usdcMint);
}

const PLACEHOLDER_PROGRAM_ID = "Wcup111111111111111111111111111111111111111";

/** SPL token account rent on devnet/mainnet (~0.00203928 SOL). */
export const TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280;
const TX_FEE_BUFFER_LAMPORTS = 10_000;

export type PlacePredictionRequirements = {
  needsUserAta: boolean;
  needsEscrowAta: boolean;
  estimatedLamports: number;
};

export async function getPlacePredictionRequirements(params: {
  userPubkey: string;
  marketExternalId: string;
}): Promise<PlacePredictionRequirements> {
  const connection = getConnection();
  const user = new PublicKey(params.userPubkey);
  const mint = getUsdcMint();
  const userAta = getAssociatedTokenAddressSync(mint, user);
  const escrowPda = getEscrowPdaForExternalMarket(params.marketExternalId, params.userPubkey);
  const escrowAta = getAssociatedTokenAddressSync(mint, escrowPda, true);

  const [userAtaInfo, escrowAtaInfo] = await Promise.all([
    connection.getAccountInfo(userAta),
    connection.getAccountInfo(escrowAta),
  ]);

  const needsUserAta = !userAtaInfo;
  const needsEscrowAta = !escrowAtaInfo;
  let estimatedLamports = TX_FEE_BUFFER_LAMPORTS;
  if (needsUserAta) estimatedLamports += TOKEN_ACCOUNT_RENT_LAMPORTS;
  if (needsEscrowAta) estimatedLamports += TOKEN_ACCOUNT_RENT_LAMPORTS;

  return { needsUserAta, needsEscrowAta, estimatedLamports };
}

export type EnsureEscrowAtaResult = { ok: true } | { ok: false; reason: string };

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

/** Create escrow ATA with settlement authority so the user tx is only a USDC transfer (+ fee). */
export async function ensureEscrowAtaForUser(params: {
  marketExternalId: string;
  userPubkey: string;
}): Promise<EnsureEscrowAtaResult> {
  const authority = loadSettlementAuthority();
  if (!authority) return { ok: false, reason: "settlement_authority_missing" };

  try {
    const connection = getConnection();
    const mint = getUsdcMint();
    const escrowPda = getEscrowPdaForExternalMarket(params.marketExternalId, params.userPubkey);
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowPda, true);
    const existing = await connection.getAccountInfo(escrowAta);
    if (existing) return { ok: true };

    const authoritySol = await connection.getBalance(authority.publicKey);
    if (authoritySol < TOKEN_ACCOUNT_RENT_LAMPORTS + TX_FEE_BUFFER_LAMPORTS) {
      return {
        ok: false,
        reason: `settlement_pool_low_sol:${authoritySol}`,
      };
    }

    const tx = new Transaction();
    tx.add(
      createAssociatedTokenAccountInstruction(
        authority.publicKey,
        escrowAta,
        escrowPda,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        true,
      ),
    );
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority.publicKey;
    tx.sign(authority);

    const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "escrow_ata_create_failed",
    };
  }
}

export async function buildPlacePredictionTx(
  params: {
    userPubkey: string;
    amount: number;
    marketExternalId: string;
  },
  connection: Connection = getConnection(),
): Promise<{ transaction: string; escrowPda: string } | null> {
  try {
    const user = new PublicKey(params.userPubkey);
    const mint = getUsdcMint();
    const userAta = getAssociatedTokenAddressSync(mint, user);
    const escrowPda = getEscrowPdaForExternalMarket(params.marketExternalId, params.userPubkey);
    const escrowAta = getAssociatedTokenAddressSync(mint, escrowPda, true);

    const tx = new Transaction();
    const userAtaInfo = await connection.getAccountInfo(userAta);
    if (!userAtaInfo) {
      tx.add(createAssociatedTokenAccountInstruction(user, userAta, user, mint));
    }

    const escrowInfo = await connection.getAccountInfo(escrowAta);
    if (!escrowInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          user,
          escrowAta,
          escrowPda,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
          true,
        ),
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

export type ClaimPayoutResult = {
  signature: string;
  explorerUrl: string;
  source: "settlement_pool";
};

/** Send verified USDC payout to the user's wallet from the settlement authority pool. */
export async function executeClaimPayout(params: {
  userPubkey: string;
  amount: number;
}): Promise<ClaimPayoutResult | null> {
  const authority = loadSettlementAuthority();
  if (!authority) return null;

  const connection = getConnection();
  const mint = getUsdcMint();
  const user = new PublicKey(params.userPubkey);
  const userAta = getAssociatedTokenAddressSync(mint, user);
  const authorityAta = getAssociatedTokenAddressSync(mint, authority.publicKey);
  const amountLamports = BigInt(Math.floor(params.amount * 1_000_000));
  if (amountLamports <= 0n) return null;

  try {
    const pool = await getAccount(connection, authorityAta);
    if (pool.amount < amountLamports) return null;
  } catch {
    return null;
  }

  const tx = new Transaction();
  const userAtaInfo = await connection.getAccountInfo(userAta);
  if (!userAtaInfo) {
    tx.add(createAssociatedTokenAccountInstruction(authority.publicKey, userAta, user, mint));
  }

  tx.add(createTransferInstruction(authorityAta, userAta, authority.publicKey, amountLamports));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = authority.publicKey;
  tx.sign(authority);

  const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

  return {
    signature,
    explorerUrl: getExplorerUrl(signature),
    source: "settlement_pool",
  };
}

export const TXORACLE_PROGRAM_ID = getTxoracleConfig(env.solanaNetwork).programId;
export const TXL_TOKEN_MINT = getTxoracleConfig(env.solanaNetwork).txlTokenMint;
