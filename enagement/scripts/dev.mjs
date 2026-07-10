import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEnvFiles } from "./load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = loadEnvFiles();

const apiPort = process.env.NITRO_DEV_PORT ?? "3031";
const vitePort = process.env.VITE_PORT ?? "3019";
const apiUrl = `http://127.0.0.1:${apiPort}`;

if (envFile) {
  console.log(`[dev] loaded env from ${envFile}`);
} else {
  console.warn("[dev] no .env found — copy enagement/.env.example or use parent ../.env");
}

// Symlink shared parent lib modules for Nitro dev bundling
await import("./link-parent-lib.mjs");

function waitForApi(maxMs = 30_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/health`);
        if (res.ok) return resolve();
      } catch {
        // not ready yet
      }
      if (Date.now() - started > maxMs) {
        return reject(new Error(`Nitro API did not become ready on ${apiUrl}`));
      }
      setTimeout(tick, 400);
    };
    void tick();
  });
}

const nitro = spawn("npx", ["nitro", "dev", "--port", apiPort, "--host", "127.0.0.1"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NITRO_DEV_PORT: apiPort,
    NODE_ENV: "development",
    REQUIRE_LIVE_DATA: process.env.REQUIRE_LIVE_DATA ?? "false",
  },
});

let vite = null;

function shutdown(code = 0) {
  nitro.kill("SIGTERM");
  vite?.kill("SIGTERM");
  process.exit(code);
}

nitro.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});

waitForApi()
  .then(() => {
    vite = spawn(
      "npx",
      ["vite", "dev", "--host", "127.0.0.1", "--port", vitePort, "--strictPort"],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_API_PROXY_TARGET: apiUrl,
          VITE_PORT: vitePort,
        },
      },
    );
    vite.on("exit", (code) => shutdown(code ?? 0));
    console.log(`\nMatchMind dev ready:`);
    console.log(`  App:  http://127.0.0.1:${vitePort}/`);
    console.log(`  API:  ${apiUrl}/api/health\n`);
  })
  .catch((err) => {
    console.error(err.message);
    shutdown(1);
  });

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
