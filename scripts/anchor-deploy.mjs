#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homedir } from "node:os";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function loadEnvFile() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function resolveDeployerKeypairPath() {
  const secret = process.env.SOLANA_DEPLOYER_SECRET ?? process.env.SETTLEMENT_AUTHORITY_SECRET;
  if (!secret) {
    console.error("Set SOLANA_DEPLOYER_SECRET in .env (base58 or JSON byte array)");
    process.exit(1);
  }
  const trimmed = secret.trim();
  let bytes;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) bytes = Uint8Array.from(parsed);
  } catch {
    bytes = bs58.decode(trimmed);
  }
  const kp = Keypair.fromSecretKey(bytes);
  const keyPath = path.join(homedir(), ".config/solana/worldcup-deployer.json");
  mkdirSync(path.dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, JSON.stringify(Array.from(kp.secretKey)));
  console.log("Deployer:", kp.publicKey.toBase58());
  return keyPath;
}

loadEnvFile();
const wallet = resolveDeployerKeypairPath();

console.log("Building worldcup_os...");
run("anchor", ["build"]);

console.log("\nDeploying to devnet...");
console.log("Wallet needs ~1.8 SOL. Fund via https://faucet.solana.com if deploy fails.\n");
run("anchor", ["deploy", "--provider.cluster", "devnet", "--provider.wallet", wallet]);

const idl = path.join(root, "target/idl/worldcup_os.json");
const dest = path.join(root, "src/server/blockchain/idl/worldcup_os.json");
run("cp", [idl, dest]);

console.log("\nProgram ID (devnet): Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6");
console.log("Rebuild app and restart server after deploy.");
