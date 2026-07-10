#!/usr/bin/env tsx
/**
 * Mint devnet USDC to settlement authority (when deployer is mint authority).
 * Usage: npm run refill:usdc-pool -- [amount]
 */
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  mintTo,
} from "@solana/spl-token";
import { getConnection, getUsdcMint } from "../src/server/blockchain/escrow";
import { getFaucetPoolBalance } from "../src/server/blockchain/faucet";
import { loadSettlementAuthority } from "../src/server/blockchain/settlement";
import { env } from "../src/server/config/env";
import bs58 from "bs58";

const amount = Number(process.argv[2] ?? 10_000);

function keypairFromSecret(secret: string): Keypair | null {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  try {
    const bytes = JSON.parse(trimmed) as number[];
    if (Array.isArray(bytes) && bytes.length === 64) {
      return Keypair.fromSecretKey(Uint8Array.from(bytes));
    }
  } catch {
    // base58
  }
  try {
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch {
    return null;
  }
}

function loadDeployerKeypair(): Keypair | null {
  const secret = process.env.SOLANA_DEPLOYER_SECRET;
  if (!secret) return null;
  return keypairFromSecret(secret);
}

async function ensureAta(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  if (!(await connection.getAccountInfo(ata))) {
    const tx = new Transaction().add(createAssociatedTokenAccountInstruction(payer.publicKey, ata, owner, mint));
    await sendAndConfirmTransaction(connection, tx, [payer]);
  }
  return ata;
}

async function main() {
  if (env.solanaNetwork !== "devnet") throw new Error("Devnet only");
  const settlement = loadSettlementAuthority();
  if (!settlement) throw new Error("Settlement authority not configured");

  const connection = getConnection();
  const mint = getUsdcMint();
  const mintInfo = await getMint(connection, mint);
  if (!mintInfo.mintAuthority) throw new Error("Mint has no authority — transfer USDC manually");

  const deployer = loadDeployerKeypair();
  const minter =
    deployer && mintInfo.mintAuthority.equals(deployer.publicKey)
      ? deployer
      : mintInfo.mintAuthority.equals(settlement.publicKey)
        ? settlement
        : null;

  if (!minter) {
    throw new Error(
      `Mint authority is ${mintInfo.mintAuthority.toBase58()}. Set SOLANA_DEPLOYER_SECRET to that wallet or fund ${settlement.publicKey.toBase58()} manually.`,
    );
  }

  const poolAta = await ensureAta(connection, minter, settlement.publicKey, mint);
  const before = await getFaucetPoolBalance();
  console.log("Settlement authority:", settlement.publicKey.toBase58());
  console.log("Minter:", minter.publicKey.toBase58());
  console.log("Pool before:", before, "USDC");

  const lamports = BigInt(Math.floor(amount * 1_000_000));
  const sig = await mintTo(connection, minter, mint, poolAta, minter, lamports);
  const after = await getFaucetPoolBalance();
  console.log("Minted", amount, "USDC. Signature:", sig);
  console.log("Pool after:", after, "USDC");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
