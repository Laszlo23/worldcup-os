#!/usr/bin/env node
/**
 * Standalone TxLINE listener + worker process.
 * Run: npx tsx scripts/worker.ts
 */
import { loadEnv } from "./load-env.ts";
import { startTxlineListener, runWorkerTick } from "../src/server/workers/runner";

loadEnv();

async function main() {
  console.log("[worker] Starting TxLINE listener...");
  await startTxlineListener();

  setInterval(async () => {
    try {
      const result = await runWorkerTick();
      console.log("[worker] tick", JSON.stringify(result));
    } catch (err) {
      console.error("[worker] tick error", err);
    }
  }, 30_000);
}

main().catch(console.error);
