#!/usr/bin/env node
/**
 * Subscribe to TxLINE free tier on-chain + activate API token.
 * Devnet: service level 1 (World Cup, 60s delay). Mainnet: 1 or 12.
 *
 * Requires: SOLANA_DEPLOYER_SECRET, TXLINE_API_ORIGIN, TXORACLE_PROGRAM_ID
 * Writes TXLINE_GUEST_JWT + TXLINE_API_TOKEN to .env
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import axios from "axios";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function loadEnv() {
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

function loadKeypair() {
  const secret = process.env.SOLANA_DEPLOYER_SECRET ?? process.env.SETTLEMENT_AUTHORITY_SECRET;
  if (!secret) throw new Error("Set SOLANA_DEPLOYER_SECRET in .env");
  const trimmed = secret.trim();
  let bytes;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) bytes = Uint8Array.from(parsed);
  } catch {
    bytes = bs58.decode(trimmed);
  }
  return Keypair.fromSecretKey(bytes);
}

function upsertEnv(key, value) {
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  env = re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, env);
  process.env[key] = value;
}

loadEnv();

const network = process.env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet";
const apiOrigin = process.env.TXLINE_API_ORIGIN ?? (network === "mainnet" ? "https://txline.txodds.com" : "https://txline-dev.txodds.com");
const programId = new PublicKey(process.env.TXORACLE_PROGRAM_ID ?? "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const txlMint = new PublicKey(
  process.env.TXL_TOKEN_MINT ?? (network === "mainnet" ? "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL" : "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
);
const serviceLevel = Number(process.env.TXLINE_SERVICE_LEVEL ?? (network === "devnet" ? "1" : "12"));
const durationWeeks = 4;
const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

const idlPath = path.join(root, "src/lib/txoracle/idl/txoracle.json");
const idl = JSON.parse(readFileSync(idlPath, "utf8"));

const payer = loadKeypair();
console.log("Wallet:", payer.publicKey.toBase58());
console.log("Network:", network, "| TxLINE:", apiOrigin, "| SL:", serviceLevel);

const connection = new Connection(rpcUrl, "confirmed");
const wallet = new anchor.Wallet(payer);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
anchor.setProvider(provider);
const program = new anchor.Program(idl, provider);

const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], programId);
const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], programId);
const tokenTreasuryVault = getAssociatedTokenAddressSync(txlMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
const userTokenAccount = getAssociatedTokenAddressSync(txlMint, payer.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

try {
  await getAccount(connection, userTokenAccount, undefined, TOKEN_2022_PROGRAM_ID);
} catch {
  console.log("Creating TxL token account...");
  const ix = createAssociatedTokenAccountIdempotentInstruction(
    payer.publicKey,
    userTokenAccount,
    payer.publicKey,
    txlMint,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const tx = new Transaction().add(ix);
  await provider.sendAndConfirm(tx);
}

console.log("Subscribing on-chain...");
const txSig = await program.methods
  .subscribe(serviceLevel, durationWeeks)
  .accounts({
    user: payer.publicKey,
    pricingMatrix: pricingMatrixPda,
    tokenMint: txlMint,
    userTokenAccount,
    tokenTreasuryVault,
    tokenTreasuryPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
console.log("Subscribe tx:", txSig);

const authRes = await axios.post(`${apiOrigin}/auth/guest/start`);
const guestJwt = authRes.data?.token ?? authRes.data?.jwt;
if (!guestJwt) throw new Error("Guest JWT failed");

const leagues = [];
const messageString = `${txSig}:${leagues.join(",")}:${guestJwt}`;
const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), payer.secretKey);
const walletSignature = Buffer.from(signatureBytes).toString("base64");

console.log("Activating API token...");
const activationRes = await axios.post(
  `${apiOrigin}/api/token/activate`,
  { txSig, walletSignature, leagues },
  { headers: { Authorization: `Bearer ${guestJwt}`, "Content-Type": "application/json" } },
);
const apiToken =
  typeof activationRes.data === "string"
    ? activationRes.data
    : (activationRes.data?.token ?? activationRes.data?.apiToken ?? activationRes.data?.api_token);
if (!apiToken) throw new Error(`Activation failed: ${JSON.stringify(activationRes.data)}`);

upsertEnv("TXLINE_GUEST_JWT", guestJwt);
upsertEnv("TXLINE_API_TOKEN", apiToken);
upsertEnv("TXLINE_API_ORIGIN", apiOrigin);
upsertEnv("TXLINE_SERVICE_LEVEL", String(serviceLevel));

console.log("TxLINE credentials saved to .env");
console.log("Testing fixtures snapshot...");
const snap = await axios.get(`${apiOrigin}/api/fixtures/snapshot`, {
  headers: { Authorization: `Bearer ${guestJwt}`, "X-Api-Token": apiToken },
});
const fixtures = Array.isArray(snap.data) ? snap.data : (snap.data?.fixtures ?? []);
console.log("Fixtures:", fixtures.length);
