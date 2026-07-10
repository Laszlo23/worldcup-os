#!/usr/bin/env node
/**
 * Production start — built Nitro serves SSR app + API on one port.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? process.env.NITRO_DEV_PORT ?? "3031";
const nitroEntry = path.join(root, ".output", "server", "index.mjs");

if (!existsSync(nitroEntry)) {
  console.error("Missing build. Run: npm run build");
  process.exit(1);
}

const child = spawn(process.execPath, [nitroEntry], {
  cwd: path.join(root, ".output"),
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOST: process.env.HOST ?? "0.0.0.0",
    NODE_ENV: process.env.NODE_ENV ?? "production",
    REQUIRE_LIVE_DATA: process.env.REQUIRE_LIVE_DATA ?? "false",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGTERM"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

console.log(`MatchMind listening on http://${process.env.HOST ?? "0.0.0.0"}:${port}/`);
