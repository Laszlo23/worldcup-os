#!/usr/bin/env node
/**
 * TxLINE AI Trader — hackathon readiness audit
 * Usage: BASE_URL=https://agentx.buildingcultureid.space npm run test:hackathon-readiness
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = (process.env.BASE_URL ?? "https://agentx.buildingcultureid.space").replace(/\/$/, "");

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  track: "Trading Tools and Agents — TxODDS World Cup Hackathon",
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
  if (!res.ok) {
    report.ready = false;
    writeReports();
    process.exit(1);
  }

  record("database", "Postgres", body.database ? "pass" : "fail", body.database ? "connected" : "down");
  record("txline_auth", "TxLINE credentials", body.txlineAuthenticated ? "pass" : "fail", String(body.txlineAuthenticated));
  record(
    "live_ingestion",
    "Live TxLINE ingestion",
    body.liveIngestion ? "pass" : body.ingestionMode === "demo-fallback" ? "warn" : "warn",
    `mode=${body.ingestionMode}, live=${body.liveIngestion}`,
  );
  record(
    "sse_streams",
    "SSE streams",
    body.scoresStream || body.oddsStream ? "pass" : "warn",
    `scores=${body.scoresStream}, odds=${body.oddsStream}`,
  );

  const { body: matches } = await fetchJson("/api/live-matches");
  const count = matches.matches?.length ?? 0;
  record("matches", "Match feed", count > 0 ? "pass" : "warn", `${count} matches`);

  const { body: signals } = await fetchJson("/api/signals?limit=5");
  record("signals", "Signal engine", (signals.signals?.length ?? 0) > 0 ? "pass" : "warn", `${signals.signals?.length ?? 0} signals`);

  const { body: agents } = await fetchJson("/api/agents");
  const agentCount = agents.agents?.length ?? 0;
  record("agents", "Agent arena", agentCount >= 2 ? "pass" : "fail", `${agentCount} agents`);

  for (const route of ["/", "/matches", "/signals", "/arena", "/portfolio"]) {
    const page = await fetch(`${BASE_URL}${route}`, { signal: AbortSignal.timeout(15000) });
    record(`page_${route}`, `Page ${route}`, page.ok ? "pass" : "fail", `HTTP ${page.status}`);
  }

  const fails = report.checks.filter((c) => c.status === "fail").length;
  report.ready = fails === 0;
  writeReports();
  process.exit(fails > 0 ? 1 : 0);
}

function writeReports() {
  const jsonPath = path.join(root, "hackathon-readiness-report.json");
  const mdPath = path.join(root, "hackathon-readiness-report.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const lines = [
    `# TxLINE AI Trader — Readiness Report`,
    ``,
    `Generated: ${report.generatedAt}`,
    `Base URL: ${BASE_URL}`,
    ``,
    `**Ready:** ${report.ready ? "YES" : "NO"}`,
    ``,
    `| Check | Status | Detail |`,
    `|-------|--------|--------|`,
    ...report.checks.map((c) => `| ${c.name} | ${c.status} | ${c.detail} |`),
  ];
  writeFileSync(mdPath, lines.join("\n"));
  console.log(`\nWrote ${mdPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
