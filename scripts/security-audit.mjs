#!/usr/bin/env node
/**
 * Security audit — dependency scan + production HTTP probes.
 * Usage: BASE_URL=https://wmos.buildingcultureid.space npm run security:audit
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = (process.env.BASE_URL ?? "https://wmos.buildingcultureid.space").replace(/\/$/, "");

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  checks: [],
  ready: false,
  summary: { pass: 0, warn: 0, fail: 0 },
};

function record(id, name, status, detail) {
  report.checks.push({ id, name, status, detail });
  report.summary[status === "pass" ? "pass" : status === "warn" ? "warn" : "fail"]++;
  const icon = status === "pass" ? "✓" : status === "warn" ? "!" : "✗";
  console.log(`${icon} [${status.toUpperCase()}] ${name}: ${detail}`);
}

async function fetchProbe(pathname, init = {}) {
  const res = await fetch(`${BASE_URL}${pathname}`, { signal: AbortSignal.timeout(15000), ...init });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function runNpmAudit(cwd, label) {
  const r = spawnSync("npm", ["audit", "--audit-level=high", "--json"], { cwd, encoding: "utf8" });
  let vulns = 0;
  try {
    const parsed = JSON.parse(r.stdout || "{}");
    vulns = parsed.metadata?.vulnerabilities?.high ?? 0;
    vulns += parsed.metadata?.vulnerabilities?.critical ?? 0;
  } catch {
    vulns = r.status !== 0 ? -1 : 0;
  }
  if (vulns < 0) {
    record(`audit_${label}`, `npm audit (${label})`, "warn", "audit command failed or parse error");
  } else if (vulns === 0) {
    record(`audit_${label}`, `npm audit (${label})`, "pass", "no high/critical vulnerabilities");
  } else {
    record(`audit_${label}`, `npm audit (${label})`, "warn", `${vulns} high/critical — run npm audit fix`);
  }
}

async function checkProtectedEndpoints() {
  const probes = [
    {
      id: "security_settle",
      name: "Settlement endpoint locked",
      path: "/api/replay/settle",
      method: "POST",
      body: { matchExternalId: "fx-test", fixtureId: 1 },
      expect: [401, 403],
    },
    {
      id: "security_worker_tick",
      name: "Worker tick locked",
      path: "/api/workers/tick",
      method: "POST",
      body: {},
      expect: [401, 403],
    },
    {
      id: "security_internal_award",
      name: "Internal superfan award locked",
      path: "/api/superfan/internal/award",
      method: "POST",
      body: {
        walletPubkey: "6XitbmLNPGzsvGo6aNTbMG3uvwqdbmssy8g4zhbJrUTr",
        source: "share",
        app: "wmos",
        points: 1,
        idempotencyKey: "audit-probe-key",
      },
      expect: [401, 403],
    },
    {
      id: "security_admin",
      name: "Admin dashboard locked",
      path: "/api/admin",
      method: "GET",
      expect: [401, 403],
    },
    {
      id: "security_place_prediction",
      name: "Place prediction requires session",
      path: "/api/predictions/place",
      method: "POST",
      body: { marketExternalId: "m1", optionExternalId: "o1", amount: 1, txSignature: "fake" },
      expect: [401, 403],
    },
  ];

  for (const probe of probes) {
    const { res } = await fetchProbe(probe.path, {
      method: probe.method,
      headers: { "content-type": "application/json" },
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    });
    const ok = probe.expect.includes(res.status);
    record(probe.id, probe.name, ok ? "pass" : "fail", `HTTP ${res.status}`);
  }
}

async function checkWebacyIntegration() {
  let apiKey = process.env.WEBACY_API_KEY || process.env.WEBACCEL_API_KEY || "";
  if (!apiKey) {
    try {
      const envText = readFileSync(path.join(root, ".env"), "utf8");
      const primary = envText.match(/^WEBACY_API_KEY=(.*)$/m);
      const legacy = envText.match(/^WEBACCEL_API_KEY=(.*)$/m);
      apiKey = (primary?.[1] ?? legacy?.[1] ?? "").trim();
    } catch {
      // no local .env
    }
  }

  if (!apiKey) {
    record("webacy_config", "Webacy screening", "warn", "WEBACY_API_KEY not set — screening disabled (fail-open)");
    return;
  }

  const testWallet = "6XitbmLNPGzsvGo6aNTbMG3uvwqdbmssy8g4zhbJrUTr";
  try {
    const res = await fetch(
      `https://api.webacy.com/addresses/sanctioned/${testWallet}?chain=sol`,
      {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (res.status === 200) {
      record("webacy_config", "Webacy API key valid", "pass", "sanctions endpoint returned 200 for test wallet");
    } else if (res.status === 401) {
      record("webacy_config", "Webacy API key valid", "fail", "Webacy returned 401 — check WEBACY_API_KEY");
    } else {
      record("webacy_config", "Webacy API key valid", "warn", `Webacy returned HTTP ${res.status}`);
    }
  } catch (err) {
    record(
      "webacy_config",
      "Webacy API reachable",
      "warn",
      err instanceof Error ? err.message : "request failed",
    );
  }

  try {
    const { body } = await fetchProbe("/api/health");
    if (body.webacyConfigured === true) {
      record("webacy_health", "Health reports Webacy configured", "pass", "webacyConfigured=true");
    } else {
      record(
        "webacy_health",
        "Health reports Webacy configured",
        "warn",
        "API key present locally but /api/health.webacyConfigured is not true",
      );
    }
  } catch (err) {
    record(
      "webacy_health",
      "Health reports Webacy configured",
      "warn",
      err instanceof Error ? err.message : "health probe failed",
    );
  }
}

async function checkSecurityHeaders() {
  const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(15000) });
  const required = ["X-Content-Type-Options", "X-Frame-Options", "Content-Security-Policy"];
  const missing = required.filter((h) => !res.headers.get(h));
  record(
    "security_headers",
    "Security headers on /api/health",
    missing.length === 0 ? "pass" : "fail",
    missing.length === 0 ? required.join(", ") : `missing: ${missing.join(", ")}`,
  );
  const hsts = res.headers.get("Strict-Transport-Security");
  record(
    "security_hsts",
    "HSTS on HTTPS",
    hsts ? "pass" : "warn",
    hsts ?? "not set (ok for local HTTP)",
  );
}

function writeReport() {
  const fails = report.checks.filter((c) => c.status === "fail");
  report.ready = fails.length === 0;
  const md = [
    `# Security Audit Report`,
    ``,
    `**Generated:** ${report.generatedAt}`,
    `**Base URL:** ${BASE_URL}`,
    `**Verdict:** ${report.ready ? "PASS" : "FAIL"} (${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail)`,
    ``,
    `| Status | Check | Detail |`,
    `|--------|-------|--------|`,
    ...report.checks.map((c) => `| ${c.status.toUpperCase()} | ${c.name} | ${c.detail.replace(/\|/g, "\\|")} |`),
    ``,
    `Re-run: \`BASE_URL=${BASE_URL} npm run security:audit\``,
  ].join("\n");
  writeFileSync(path.join(root, "security-audit-report.md"), md);
  writeFileSync(path.join(root, "security-audit-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nWrote security-audit-report.md`);
}

async function main() {
  console.log(`\nSecurity Audit — ${BASE_URL}\n`);
  runNpmAudit(root, "root");
  runNpmAudit(path.join(root, "enagement"), "enagement");
  runNpmAudit(path.join(root, "agentx"), "agentx");
  await checkProtectedEndpoints();
  await checkWebacyIntegration();
  await checkSecurityHeaders();
  writeReport();
  process.exit(report.ready ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
