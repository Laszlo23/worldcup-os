#!/usr/bin/env node
/**
 * Post uptime/reachability feedback to 8004 registry after health checks.
 * Usage: node scripts/trust8004-heartbeat.mjs [--dry-run]
 */
import { loadEnv } from "./load-env.mjs";

loadEnv();

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const asset = process.env.AGENT_8004_ASSET?.trim();
  if (!asset) {
    console.log(JSON.stringify({ skipped: true, reason: "AGENT_8004_ASSET not set" }));
    return;
  }

  const apps = [
    { name: "wmos", url: process.env.WMOS_URL ?? "https://wmos.buildingcultureid.space" },
    { name: "agentx", url: process.env.AGENTX_URL ?? "https://agentx.buildingcultureid.space" },
    { name: "matchmind", url: process.env.MATCHMIND_URL ?? "https://match.buildingcultureid.space" },
  ];

  const checks = await Promise.all(
    apps.map(async ({ name, url }) => {
      try {
        const res = await fetch(`${url.replace(/\/$/, "")}/api/health`, { signal: AbortSignal.timeout(12_000) });
        const body = await res.json().catch(() => ({}));
        return { name, ok: res.ok, status: body.status ?? "unknown" };
      } catch (err) {
        return { name, ok: false, status: "unreachable", error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );

  const okCount = checks.filter((c) => c.ok).length;
  const uptimePercent = (okCount / checks.length) * 100;
  const appsHealthy = okCount === checks.length;
  const detail = checks.map((c) => `${c.name}=${c.status}`).join(", ");

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, asset, uptimePercent, appsHealthy, checks }, null, 2));
    return;
  }

  const { submitTrust8004HeartbeatFeedback } = await import("../src/server/services/trust8004/client.ts");
  const result = await submitTrust8004HeartbeatFeedback({
    uptimePercent,
    reachable: okCount > 0,
    appsHealthy,
    detail,
  });

  console.log(JSON.stringify({ asset, uptimePercent, appsHealthy, checks, feedback: result }, null, 2));
  if (!result.submitted) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
