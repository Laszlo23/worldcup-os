#!/usr/bin/env tsx
/**
 * Send devnet SOL to a wallet (deployer transfer or faucet airdrop).
 * Usage: npm run fund:sol -- <pubkey> [amount_sol]
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "../src/server/config/env";

const recipientArg = process.argv[2];
const amountSol = Number(process.argv[3] ?? 0.5);

if (!recipientArg) {
  console.error("Usage: npm run fund:sol -- <wallet-pubkey> [amount_sol]");
  process.exit(1);
}

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

async function main() {
  if (env.solanaNetwork !== "devnet") throw new Error("Devnet only");
  const recipient = new PublicKey(recipientArg);
  const connection = new Connection(env.solanaRpcUrl, "confirmed");
  const deployer = loadDeployer();
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const depBal = await connection.getBalance(deployer.publicKey);
  const before = await connection.getBalance(recipient);
  console.log("Deployer:", deployer.publicKey.toBase58(), (depBal / LAMPORTS_PER_SOL).toFixed(4), "SOL");
  console.log("Recipient before:", (before / LAMPORTS_PER_SOL).toFixed(4), "SOL");

  let signature: string;
  if (depBal >= lamports + 5000) {
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: deployer.publicKey, toPubkey: recipient, lamports }),
    );
    signature = await sendAndConfirmTransaction(connection, tx, [deployer]);
  } else {
    console.log("Deployer low on SOL — using devnet faucet airdrop");
    signature = await connection.requestAirdrop(recipient, lamports);
    await connection.confirmTransaction(signature, "confirmed");
  }

  const after = await connection.getBalance(recipient);
  console.log("Sent", amountSol, "SOL to", recipientArg);
  console.log("Recipient after:", (after / LAMPORTS_PER_SOL).toFixed(4), "SOL");
  console.log("Explorer:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
