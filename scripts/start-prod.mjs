#!/usr/bin/env node
/**
 * Production server entry — run after `npm run build`.
 * Listens on PORT (default 3000).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, ".output", "server", "index.mjs");

if (!existsSync(entry)) {
  console.error("Build output missing. Run: npm run build");
  process.exit(1);
}

const port = process.env.PORT ?? "3000";
const child = spawn(process.execPath, [entry], {
  cwd: path.join(root, ".output"),
  stdio: "inherit",
  env: { ...process.env, PORT: port, HOST: process.env.HOST ?? "0.0.0.0" },
});

child.on("exit", (code) => process.exit(code ?? 0));
