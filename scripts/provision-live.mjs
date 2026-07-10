#!/usr/bin/env node
/**
 * Provision production for live mode: Postgres DB, migrations, TxLINE bootstrap, worker tick.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...opts.env }, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function upsertEnv(key, value) {
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  env = re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, env);
  process.env[key] = value;
}

const dbUrl = process.argv[2];
if (!dbUrl) {
  console.error("Usage: node scripts/provision-live.mjs <DATABASE_URL>");
  process.exit(1);
}

upsertEnv("DATABASE_URL", dbUrl);
upsertEnv("REQUIRE_LIVE_DATA", "true");
if (process.env.SOLANA_NETWORK === "devnet" || !process.env.SOLANA_NETWORK) {
  upsertEnv("TXLINE_SERVICE_LEVEL", "1");
}

console.log("Running migrations...");
run("node", ["scripts/db-migrate.mjs"]);

console.log("Bootstrapping TxLINE...");
run("node", ["scripts/bootstrap-txline.mjs"]);

console.log("Syncing fixtures (worker tick)...");
run("npx", ["tsx", "-e", "import { runWorkerTick } from './src/server/workers/runner.ts'; runWorkerTick().then(r => console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exit(1)})"]);

console.log("Live provisioning complete.");
