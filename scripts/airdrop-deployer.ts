#!/usr/bin/env tsx
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { loadEnv } from "./load-env.mjs";

loadEnv();

async function main() {
  const secret = process.env.SOLANA_DEPLOYER_SECRET?.trim().replace(/^"|"$/g, "");
  if (!secret) throw new Error("SOLANA_DEPLOYER_SECRET missing");
  const kp = Keypair.fromSecretKey(bs58.decode(secret));
  const rpcs = [process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "https://rpc.ankr.com/solana_devnet"];
  const target = 0.02 * LAMPORTS_PER_SOL;

  for (const url of rpcs) {
    const c = new Connection(url, "confirmed");
    let bal = await c.getBalance(kp.publicKey);
    console.log(url, "start", bal / LAMPORTS_PER_SOL);
    if (bal >= target) return;

    for (let i = 0; i < 5 && bal < target; i++) {
      try {
        const sig = await c.requestAirdrop(kp.publicKey, 0.5 * LAMPORTS_PER_SOL);
        await c.confirmTransaction(sig, "confirmed");
        bal = await c.getBalance(kp.publicKey);
        console.log("airdropped", (bal / LAMPORTS_PER_SOL).toFixed(4), "SOL");
      } catch (err) {
        console.warn("airdrop failed:", err instanceof Error ? err.message : err);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  const final = await new Connection(rpcs[0], "confirmed").getBalance(kp.publicKey);
  console.log("final balance", (final / LAMPORTS_PER_SOL).toFixed(4), "SOL");
  if (final < 0.01 * LAMPORTS_PER_SOL) process.exit(1);
}

main();
