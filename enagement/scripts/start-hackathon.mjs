#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = process.env.NITRO_DEV_PORT ?? process.env.PORT ?? "3031";
const apiUrl = `http://127.0.0.1:${apiPort}`;
const nitroEntry = path.join(root, ".output", "server", "index.mjs");

if (!existsSync(nitroEntry)) {
  console.error("Missing build. Run: npm run build");
  process.exit(1);
}

function waitForApi(maxMs = 60_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/health`);
        if (res.ok) return resolve();
      } catch {
        // not ready
      }
      if (Date.now() - started > maxMs) {
        return reject(new Error(`API did not become ready on ${apiUrl}`));
      }
      setTimeout(tick, 500);
    };
    void tick();
  });
}

const api = spawn(process.execPath, [nitroEntry], {
  cwd: path.join(root, ".output"),
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: apiPort,
    HOST: "127.0.0.1",
    NODE_ENV: process.env.NODE_ENV ?? "production",
    REQUIRE_LIVE_DATA: process.env.REQUIRE_LIVE_DATA ?? "false",
  },
});

let vite = null;

function shutdown(code = 0) {
  api.kill("SIGTERM");
  vite?.kill("SIGTERM");
  process.exit(code);
}

api.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});

waitForApi()
  .then(() => {
    const vitePort = process.env.VITE_PORT ?? "3019";
    const publicDir = path.join(root, ".output", "public");
    if (!existsSync(publicDir)) {
      console.error("Missing build assets. Run: npm run build");
      shutdown(1);
      return;
    }
    vite = spawn(
      "npx",
      ["vite", "preview", "--host", "0.0.0.0", "--port", vitePort, "--strictPort", "--outDir", publicDir],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_API_PROXY_TARGET: apiUrl,
        },
      },
    );
    vite.on("exit", (code) => shutdown(code ?? 0));
    console.log(`\nMatchMind server ready:`);
    console.log(`  App:  http://0.0.0.0:${vitePort}/`);
    console.log(`  API:  ${apiUrl}/api/health\n`);
  })
  .catch((err) => {
    console.error(err.message);
    shutdown(1);
  });

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
