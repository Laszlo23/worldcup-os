#!/usr/bin/env tsx
/**
 * Create a devnet USDC-like mint (6 decimals) owned by deployer, mint to settlement pool.
 * Updates USDC_MINT + VITE_USDC_MINT in .env when --write-env is passed.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import bs58 from "bs58";
import { env } from "../src/server/config/env";
import { loadSettlementAuthority } from "../src/server/blockchain/settlement";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const args = process.argv.slice(2).filter((a) => a !== "--write-env");
const writeEnv = process.argv.includes("--write-env");
const mintAmount = Number(args[0] ?? 50_000);

function loadDeployer(): Keypair {
  const secret = process.env.SOLANA_DEPLOYER_SECRET ?? process.env.SETTLEMENT_AUTHORITY_SECRET;
  if (!secret) throw new Error("SOLANA_DEPLOYER_SECRET required");
  const trimmed = secret.trim();
  try {
    const parsed = JSON.parse(trimmed) as number[];
    if (Array.isArray(parsed)) return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    // base58
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

function upsertEnv(key: string, value: string) {
  if (!existsSync(envPath)) throw new Error(".env not found");
  let content = readFileSync(envPath, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  content = re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, content);
}

async function main() {
  if (env.solanaNetwork !== "devnet") throw new Error("Devnet only");
  const deployer = loadDeployer();
  const settlement = loadSettlementAuthority() ?? deployer;
  const connection = new Connection(env.solanaRpcUrl, "confirmed");

  console.log("Deployer:", deployer.publicKey.toBase58());
  console.log("Settlement pool:", settlement.publicKey.toBase58());

  const mint = await createMint(connection, deployer, deployer.publicKey, null, 6);
  console.log("Created mint:", mint.toBase58());

  const poolAta = getAssociatedTokenAddressSync(mint, settlement.publicKey);
  const createAtaTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(deployer.publicKey, poolAta, settlement.publicKey, mint),
  );
  await sendAndConfirmTransaction(connection, createAtaTx, [deployer]);

  const lamports = BigInt(Math.floor(mintAmount * 1_000_000));
  const sig = await mintTo(connection, deployer, mint, poolAta, deployer, lamports);
  console.log("Minted", mintAmount, "USDC to pool. Tx:", sig);

  if (writeEnv) {
    upsertEnv("USDC_MINT", mint.toBase58());
    upsertEnv("VITE_USDC_MINT", mint.toBase58());
    console.log("Updated .env USDC_MINT + VITE_USDC_MINT");
  } else {
    console.log("\nAdd to .env:");
    console.log(`USDC_MINT=${mint.toBase58()}`);
    console.log(`VITE_USDC_MINT=${mint.toBase58()}`);
    console.log("\nRe-run with --write-env to patch .env automatically.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
