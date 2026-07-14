#!/usr/bin/env node
/**
 * MatchMind — hackathon readiness audit
 * Usage: BASE_URL=https://match.buildingcultureid.space npm run test:hackathon-readiness
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = (process.env.BASE_URL ?? "https://match.buildingcultureid.space").replace(/\/$/, "");

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  track: "Consumer and Fan Experiences — TxODDS World Cup Hackathon",
  checks: [],
  ready: false,
};

function record(id, name, status, detail) {
  report.checks.push({ id, name, status, detail });
  console.log(`${status === "pass" ? "✓" : status === "warn" ? "!" : "✗"} [${status.toUpperCase()}] ${name}: ${detail}`);
}

async function fetchJson(pathname) {
  const res = await fetch(`${BASE_URL}${pathname}`, { signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  const { res, body } = await fetchJson("/api/health");
  record("health", "API health", res.ok ? "pass" : "fail", `HTTP ${res.status}`);

  record("database", "Postgres", body.database ? "pass" : "fail", String(body.database));
  record("txline", "TxLINE", body.txline?.status === "healthy" ? "pass" : "warn", body.txline?.status ?? "unknown");
  record(
    "worker",
    "Shared TxLINE worker",
    body.worker?.healthy || body.worker?.sseActive ? "pass" : "warn",
    body.worker?.hint ?? "check worldcup-worker",
  );

  const { body: featured } = await fetchJson("/api/engagement/featured");
  record("featured", "Featured match", featured.match ? "pass" : "warn", featured.match ? "ok" : "none");

  const { body: polls } = await fetchJson("/api/engagement/polls");
  record("polls", "Engagement polls API", Array.isArray(polls.polls) ? "pass" : "fail", `${polls.polls?.length ?? 0} polls`);

  const { body: moments } = await fetchJson("/api/engagement/moments");
  record("moments", "Moments API", Array.isArray(moments.moments) ? "pass" : "fail", `${moments.moments?.length ?? 0} moments`);

  for (const route of ["/", "/moments", "/passport", "/rewards"]) {
    const page = await fetch(`${BASE_URL}${route}`, { signal: AbortSignal.timeout(15000) });
    record(`page_${route}`, `Page ${route}`, page.ok ? "pass" : "fail", `HTTP ${page.status}`);
  }

  const settle = await fetch(`${BASE_URL}/api/replay/settle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ matchExternalId: "fx-test", fixtureId: 1 }),
    signal: AbortSignal.timeout(15000),
  });
  record(
    "security_settle",
    "Settlement endpoint locked",
    settle.status === 403 || settle.status === 401 ? "pass" : "fail",
    `HTTP ${settle.status}`,
  );

  const workerTick = await fetch(`${BASE_URL}/api/workers/tick`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(15000),
  });
  record(
    "security_worker_tick",
    "Worker tick locked",
    workerTick.status === 403 || workerTick.status === 401 ? "pass" : "fail",
    `HTTP ${workerTick.status}`,
  );

  const healthRes = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(15000) });
  const required = ["X-Content-Type-Options", "X-Frame-Options", "Content-Security-Policy"];
  const missing = required.filter((h) => !healthRes.headers.get(h));
  record(
    "security_headers",
    "Security headers",
    missing.length === 0 ? "pass" : "warn",
    missing.length === 0 ? required.join(", ") : `missing ${missing.join(", ")}`,
  );

  const fails = report.checks.filter((c) => c.status === "fail").length;
  report.ready = fails === 0;
  const md = [
    `# MatchMind — Readiness Report`,
    ``,
    `Generated: ${report.generatedAt}`,
    `**Ready:** ${report.ready ? "YES" : "NO"}`,
    ``,
    report.checks.map((c) => `- **${c.name}** (${c.status}): ${c.detail}`).join("\n"),
  ].join("\n");
  writeFileSync(path.join(root, "hackathon-readiness-report.md"), md);
  writeFileSync(path.join(root, "hackathon-readiness-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nWrote hackathon-readiness-report.md`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
