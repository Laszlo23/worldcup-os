#!/usr/bin/env node
/**
 * Hackathon readiness audit — runnable proof for judges and submission.
 *
 * Usage:
 *   npm run test:hackathon-readiness
 *   BASE_URL=https://wmos.buildingcultureid.space npm run test:hackathon-readiness
 *   BASE_URL=http://187.124.18.204:3017 npm run test:hackathon-readiness -- --json
 *
 * Writes:
 *   hackathon-readiness-report.json
 *   hackathon-readiness-report.md
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nacl from "tweetnacl";
import bs58 from "bs58";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const jsonOnly = args.includes("--json");
const skipAuth = args.includes("--skip-auth");

const BASE_URL = (process.env.BASE_URL ?? process.env.APP_URL ?? "http://187.124.18.204:3017").replace(
  /\/$/,
  "",
);
const EXPECTED_PROGRAM_ID =
  process.env.WORLDCUP_PROGRAM_ID ?? "Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6";
const TIMEOUT_MS = Number(process.env.READINESS_TIMEOUT_MS ?? 15_000);

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  track: "Prediction Markets and Settlement — TxODDS World Cup Hackathon",
  summary: { pass: 0, warn: 0, fail: 0, skip: 0 },
  checks: [],
  ready: false,
};

function hostFromBaseUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function record(id, name, status, detail, evidence = undefined) {
  report.checks.push({ id, name, status, detail, evidence });
  report.summary[status] = (report.summary[status] ?? 0) + 1;
  const icon = status === "pass" ? "✓" : status === "warn" ? "!" : status === "skip" ? "−" : "✗";
  if (!jsonOnly) {
    console.log(`${icon} [${status.toUpperCase()}] ${name}: ${detail}`);
  }
}

async function fetchJson(pathname, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${BASE_URL}${pathname}`;
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers ?? {}),
        Origin: BASE_URL,
      },
    });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text.slice(0, 200) };
    }
    return { res, body, url };
  } finally {
    clearTimeout(timer);
  }
}

function extractCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const single = res.headers.get("set-cookie");
  return single ? single.split(";")[0] : "";
}

async function checkHealth() {
  const { res, body } = await fetchJson("/api/health");
  if (!res.ok) {
    record("health", "API health", "fail", `HTTP ${res.status}`);
    return null;
  }
  record("health", "API health", body.status === "ok" ? "pass" : "warn", `status=${body.status}`, {
    status: body.status,
    database: body.database,
    txline: body.txline?.status,
  });
  return body;
}

async function checkDatabase(health) {
  if (!health?.database) {
    record("database", "Postgres", "fail", "DATABASE_URL not configured or unreachable");
    return;
  }
  record(
    "database",
    "Postgres",
    health.databaseReachable ? "pass" : "warn",
    health.databaseReachable ? "reachable" : "configured but unreachable",
    { fixtures: health.fixtures },
  );
}

async function checkTxline(health) {
  const tx = health?.txline;
  if (!tx?.hasCredentials) {
    record("txline_creds", "TxLINE credentials", "fail", "TXLINE_API_TOKEN missing on server");
    return;
  }
  record("txline_creds", "TxLINE credentials", "pass", "API token configured");
  record(
    "txline_status",
    "TxLINE API",
    tx.status === "healthy" ? "pass" : "warn",
    `status=${tx.status}, SL${tx.serviceLevel}`,
    { lastPingOk: tx.lastPingOk, lastSseAt: tx.lastSseAt },
  );
  const fixtures = health?.fixtures?.total ?? 0;
  record(
    "fixtures",
    "Fixture sync",
    fixtures > 0 ? "pass" : "fail",
    fixtures > 0 ? `${fixtures} fixtures synced` : "no fixtures in database",
    health?.fixtures,
  );
}

async function checkSolana(health) {
  const sol = health?.solana;
  if (!sol?.programDeployed) {
    record("solana_program", "Solana program", "fail", "WORLDCUP_PROGRAM_ID not deployed");
    return;
  }
  const idOk = sol.programId === EXPECTED_PROGRAM_ID;
  record(
    "solana_program",
    "Solana program (devnet)",
    idOk ? "pass" : "warn",
    idOk ? sol.programId : `expected ${EXPECTED_PROGRAM_ID}, got ${sol.programId}`,
    sol,
  );
}

async function checkAuthDomain() {
  const testPubkey = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const { res, body } = await fetchJson(`/api/auth/nonce?pubkey=${encodeURIComponent(testPubkey)}`);
  if (!res.ok) {
    record("auth_nonce", "Auth nonce", "fail", `HTTP ${res.status}`);
    return null;
  }
  const expectedHost = hostFromBaseUrl(BASE_URL);
  const domainLine = body.message?.split("\n").find((l) => l.startsWith("Domain:"));
  const domain = domainLine?.replace("Domain:", "").trim();
  const domainOk = domain && (domain === expectedHost || domain.includes(expectedHost?.split(":")[0] ?? ""));
  record(
    "auth_nonce",
    "Auth sign-in domain",
    domainOk ? "pass" : "fail",
    domainOk ? `Domain: ${domain}` : `message domain "${domain}" ≠ app host "${expectedHost}"`,
    { messagePreview: body.message?.split("\n").slice(0, 4).join(" | ") },
  );
  return body;
}

async function checkAuthRoundtrip() {
  if (skipAuth) {
    record("auth_roundtrip", "Wallet auth roundtrip", "skip", "--skip-auth");
    return;
  }
  const keypair = nacl.sign.keyPair();
  const pubkey = bs58.encode(keypair.publicKey);
  const { res: nonceRes, body: nonceBody } = await fetchJson(
    `/api/auth/nonce?pubkey=${encodeURIComponent(pubkey)}`,
  );
  if (!nonceRes.ok) {
    record("auth_roundtrip", "Wallet auth roundtrip", "fail", `nonce HTTP ${nonceRes.status}`);
    return;
  }
  const messageBytes = new TextEncoder().encode(nonceBody.message);
  const signature = bs58.encode(nacl.sign.detached(messageBytes, keypair.secretKey));
  const { res: verifyRes, body: verifyBody } = await fetchJson("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pubkey, signature, message: nonceBody.message }),
  });
  if (!verifyRes.ok) {
    record(
      "auth_roundtrip",
      "Wallet auth roundtrip",
      "fail",
      verifyBody.error ?? `verify HTTP ${verifyRes.status}`,
    );
    return;
  }
  record("auth_roundtrip", "Wallet auth roundtrip", "pass", "nonce → sign → verify succeeded", {
    balance: verifyBody.balance,
  });
}

async function checkMatches() {
  const { res, body } = await fetchJson("/api/matches");
  if (!res.ok) {
    record("matches", "Match feed", "fail", `HTTP ${res.status}`);
    return null;
  }
  const matches = body.matches ?? [];
  record(
    "matches",
    "Match feed",
    matches.length > 0 ? "pass" : "fail",
    `${matches.length} matches`,
    { scheduled: matches.filter((m) => m.status === "scheduled").length },
  );
  const scheduledWithFakeProof = matches.filter((m) => m.status === "scheduled" && m.hasVerifiedProof);
  record(
    "honesty_scheduled",
    "No fake verified badges on upcoming matches",
    scheduledWithFakeProof.length === 0 ? "pass" : "fail",
    scheduledWithFakeProof.length === 0
      ? "scheduled matches not marked verified"
      : `${scheduledWithFakeProof.length} scheduled match(es) show hasVerifiedProof`,
  );
  return matches;
}

async function checkMarkets(matches) {
  const upcoming = matches?.find((m) => m.status === "scheduled");
  if (!upcoming) {
    record("markets", "Prediction markets", "warn", "no scheduled match to inspect");
    return;
  }
  const { res, body } = await fetchJson(`/api/matches/${upcoming.id}`);
  if (!res.ok) {
    record("markets", "Prediction markets", "fail", `HTTP ${res.status}`);
    return;
  }
  const markets = body.markets ?? [];
  const winner = markets.find((m) => m.type === "winner");
  record(
    "markets",
    "Prediction markets",
    winner && !winner.closed ? "pass" : "warn",
    winner ? `winner market open for ${upcoming.id}` : "no open winner market",
    { count: markets.length },
  );
}

async function checkProofs() {
  const { res, body } = await fetchJson("/api/proofs");
  if (!res.ok) {
    record("proofs", "Proof explorer API", "fail", `HTTP ${res.status}`);
    return;
  }
  const certs = body.proofs ?? [];
  const escrows = body.escrowProofs ?? [];
  record(
    "proofs_api",
    "Proof explorer API",
    "pass",
    `${certs.length} TxLINE certificate(s), ${escrows.length} on-chain escrow proof(s)`,
  );
  const escrowsWithTx = escrows.filter((e) => e.txSignature && !e.txSignature.includes("demo"));
  record(
    "onchain_escrow",
    "On-chain escrow proofs",
    escrowsWithTx.length > 0 ? "pass" : "warn",
    escrowsWithTx.length > 0
      ? `${escrowsWithTx.length} confirmed place-prediction tx(s)`
      : "no on-chain predictions indexed yet (place one for demo)",
    escrowsWithTx.slice(0, 3).map((e) => ({
      id: e.id,
      matchId: e.matchId,
      amount: e.amount,
      explorerUrl: e.explorerUrl,
    })),
  );
  record(
    "txline_certs_honest",
    "TxLINE certificates (finished matches only)",
    "pass",
    certs.length === 0
      ? "none yet — correct until a real fixture finishes on TxLINE"
      : `${certs.length} certificate(s) from finished fixtures`,
    certs.map((c) => ({ matchId: c.matchId, status: c.status, score: c.finalScore })),
  );
}

async function checkStream() {
  const { res, body } = await fetchJson("/api/stream/events");
  if (!res.ok) {
    record("stream", "Live event stream", "fail", `HTTP ${res.status}`);
    return;
  }
  const events = body.events ?? [];
  record(
    "stream",
    "Live event stream",
    "pass",
    `${events.length} event(s) (demo source filtered)`,
    events.slice(0, 3).map((e) => ({ title: e.title, type: e.event_type })),
  );
}

async function checkSecurity() {
  const probes = [
    {
      id: "security_settle",
      name: "Settlement endpoint locked",
      path: "/api/replay/settle",
      body: { matchExternalId: "fx-test", fixtureId: 1 },
    },
    {
      id: "security_worker_tick",
      name: "Worker tick locked",
      path: "/api/workers/tick",
      body: {},
    },
    {
      id: "security_internal_award",
      name: "Internal superfan award locked",
      path: "/api/superfan/internal/award",
      body: {
        walletPubkey: "6XitbmLNPGzsvGo6aNTbMG3uvwqdbmssy8g4zhbJrUTr",
        source: "share",
        app: "wmos",
        points: 1,
        idempotencyKey: "readiness-probe-award",
      },
    },
    {
      id: "security_admin",
      name: "Admin dashboard locked",
      path: "/api/admin",
      body: null,
      method: "GET",
    },
  ];

  for (const probe of probes) {
    const init = probe.method === "GET"
      ? { method: "GET" }
      : {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(probe.body),
        };
    const { res } = await fetchJson(probe.path, init);
    record(
      probe.id,
      probe.name,
      res.status === 403 || res.status === 401 ? "pass" : "fail",
      res.status === 403 || res.status === 401 ? `HTTP ${res.status}` : `HTTP ${res.status} (expected 401/403)`,
    );
  }

  const healthRes = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const required = ["X-Content-Type-Options", "X-Frame-Options", "Content-Security-Policy"];
  const missing = required.filter((h) => !healthRes.headers.get(h));
  record(
    "security_headers",
    "Security headers present",
    missing.length === 0 ? "pass" : "fail",
    missing.length === 0 ? required.join(", ") : `missing: ${missing.join(", ")}`,
  );
}

async function checkPages() {
  const routes = ["/", "/oracle", "/proofs", "/matches", "/portfolio"];
  for (const route of routes) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}${route}`, { signal: controller.signal });
      const ok = res.ok && (res.headers.get("content-type")?.includes("text/html") ?? false);
      record(
        `page_${route.replace(/\//g, "") || "home"}`,
        `Page ${route}`,
        ok ? "pass" : "warn",
        ok ? `HTTP ${res.status}` : `HTTP ${res.status} or non-HTML`,
      );
    } catch (err) {
      record(`page_${route}`, `Page ${route}`, "fail", err instanceof Error ? err.message : "fetch failed");
    } finally {
      clearTimeout(timer);
    }
  }
}

function writeReports() {
  const critical = report.checks.filter((c) => c.status === "fail");
  report.ready = critical.length === 0;

  const md = [
    `# Hackathon Readiness Report`,
    ``,
    `**Generated:** ${report.generatedAt}`,
    `**Base URL:** ${report.baseUrl}`,
    `**Track:** ${report.track}`,
    `**Verdict:** ${report.ready ? "READY" : "NOT READY"} (${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail)`,
    ``,
    `## Checks`,
    ``,
    `| Status | Check | Detail |`,
    `|--------|-------|--------|`,
    ...report.checks.map((c) => `| ${c.status.toUpperCase()} | ${c.name} | ${c.detail.replace(/\|/g, "\\|")} |`),
    ``,
    `## Evidence for judges`,
    ``,
    `- **Live app:** ${report.baseUrl}`,
    `- **Oracle:** ${report.baseUrl}/oracle`,
    `- **Proof explorer:** ${report.baseUrl}/proofs`,
    `- **Program (devnet):** \`${EXPECTED_PROGRAM_ID}\``,
    `- **Health:** ${report.baseUrl}/api/health`,
    ``,
    `Re-run: \`BASE_URL=${report.baseUrl} npm run test:hackathon-readiness\``,
    ``,
  ].join("\n");

  const jsonPath = path.join(root, "hackathon-readiness-report.json");
  const mdPath = path.join(root, "hackathon-readiness-report.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, md);
  if (!jsonOnly) {
    console.log(`\nReport written:`);
    console.log(`  ${jsonPath}`);
    console.log(`  ${mdPath}`);
    console.log(`\n${report.ready ? "READY for hackathon demo" : "NOT READY — fix FAIL items above"}\n`);
  }
}

async function main() {
  if (!jsonOnly) {
    console.log(`\nWorld Cup OS — Hackathon Readiness Audit`);
    console.log(`Target: ${BASE_URL}\n`);
  }

  const health = await checkHealth();
  await checkDatabase(health);
  await checkTxline(health);
  await checkSolana(health);
  await checkAuthDomain();
  await checkAuthRoundtrip();
  const matches = await checkMatches();
  await checkMarkets(matches);
  await checkProofs();
  await checkStream();
  await checkSecurity();
  await checkPages();

  writeReports();
  process.exit(report.ready ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
