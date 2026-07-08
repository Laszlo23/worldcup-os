#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Building worldcup_os...");
run("anchor", ["build"]);

console.log("\nDeploying to devnet (requires ~1.8 SOL in ~/.config/solana/id.json)...");
console.log("If airdrop is rate-limited, fund the wallet manually via https://faucet.solana.com\n");
run("anchor", ["deploy", "--provider.cluster", "devnet"]);

const idl = path.join(root, "target/idl/worldcup_os.json");
const dest = path.join(root, "src/server/blockchain/idl/worldcup_os.json");
run("cp", [idl, dest]);

console.log("\nUpdate .env with:");
console.log("WORLDCUP_PROGRAM_ID=Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6");
console.log("VITE_WORLDCUP_PROGRAM_ID=Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6");
