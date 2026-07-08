#!/usr/bin/env node
/**
 * Pre-submission smoke checks (no TxLINE credentials required).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = process.env.NITRO_DEV_PORT ?? "3006";
const base = `http://127.0.0.1:${apiPort}`;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: "inherit", shell: false });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function waitForHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return res.json();
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("API health check timed out");
}

const nitro = spawn("npx", ["nitro", "dev", "--port", apiPort, "--host", "127.0.0.1"], {
  cwd: root,
  stdio: "inherit",
});

try {
  await run("npm", ["run", "test"]);
  const health = await waitForHealth();
  const matches = await fetch(`${base}/api/matches`).then((r) => r.json());
  console.log("\nSmoke summary:");
  console.log("  health.status:", health.status);
  console.log("  solana.programId:", health.solana?.programId);
  console.log("  matches:", matches.matches?.length ?? 0);
  console.log("\nSmoke checks passed.");
} finally {
  nitro.kill("SIGTERM");
}
