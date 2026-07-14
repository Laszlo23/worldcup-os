#!/usr/bin/env node
/**
 * Superteam Earn operational agent CLI.
 * Usage: node scripts/earn-agent.mjs <discover|heartbeat|readiness|submit> [options]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv();

const BASE_URL = (process.env.SUPERTEAM_EARN_BASE_URL ?? "https://superteam.fun").replace(/\/$/, "");
const API_KEY = process.env.SUPERTEAM_EARN_API_KEY ?? "";
const AGENT_NAME = process.env.SUPERTEAM_EARN_AGENT_NAME ?? "superform-worldcup-agent";

const APP_URLS = {
  wmos: process.env.WMOS_URL ?? "https://wmos.buildingcultureid.space",
  agentx: process.env.AGENTX_URL ?? "https://agentx.buildingcultureid.space",
  matchmind: process.env.MATCHMIND_URL ?? "https://match.buildingcultureid.space",
};

function authHeaders() {
  if (!API_KEY) throw new Error("SUPERTEAM_EARN_API_KEY missing — register at POST /api/agents or set in .env");
  return { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };
}

async function earnFetch(pathname, init) {
  const res = await fetch(`${BASE_URL}${pathname}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.message ?? res.statusText;
    throw new Error(`Earn API ${res.status}: ${msg}`);
  }
  return body;
}

async function checkHealth(name, url) {
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/health`, { signal: AbortSignal.timeout(12_000) });
    const body = await res.json().catch(() => ({}));
    return {
      name,
      url,
      ok: res.ok,
      status: body.status ?? (res.ok ? "ok" : "error"),
      workerHealthy: body.worker?.healthy ?? null,
      txlineStatus: body.txline?.status ?? null,
    };
  } catch (err) {
    return { name, url, ok: false, status: "unreachable", error: err instanceof Error ? err.message : String(err) };
  }
}

async function cmdDiscover() {
  const type = process.argv[3];
  const qs = new URLSearchParams({ take: "30" });
  if (type) qs.set("type", type);
  const listings = await earnFetch(`/api/agents/listings/live?${qs}`);
  console.log(JSON.stringify(listings, null, 2));
  console.log(`\n${listings.length} agent-eligible listing(s)`);
}

async function cmdHeartbeat() {
  const checks = await Promise.all([
    checkHealth("wmos", APP_URLS.wmos),
    checkHealth("agentx", APP_URLS.agentx),
    checkHealth("matchmind", APP_URLS.matchmind),
  ]);

  const allOk = checks.every((c) => c.ok && c.status !== "unreachable");
  const workerOk = checks.filter((c) => c.name === "wmos").every((c) => c.workerHealthy !== false);

  let status = "ok";
  if (!allOk) status = "degraded";
  if (!API_KEY) status = "blocked";

  const payload = {
    status,
    agentName: AGENT_NAME,
    time: new Date().toISOString(),
    version: "earn-agent-mvp",
    capabilities: ["register", "listings", "submit", "claim", "heartbeat", "trust8004"],
    lastAction: `health check: ${checks.map((c) => `${c.name}=${c.status}`).join(", ")}`,
    nextAction: status === "ok" ? "discover listings or run readiness" : "fix degraded services",
    apps: checks,
    workerHealthy: workerOk,
  };

  console.log(JSON.stringify(payload, null, 2));

  if (process.env.AGENT_8004_ASSET?.trim()) {
    const fb = spawnSync("node", ["scripts/trust8004-heartbeat.mjs"], {
      cwd: root,
      env: process.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const fbOut = (fb.stdout ?? "").trim();
    if (fbOut) console.log(fbOut);
    if (fb.status !== 0) {
      console.error((fb.stderr ?? "").trim() || "trust8004 heartbeat feedback failed");
    }
  }

  if (status === "blocked") process.exit(1);
}

async function cmdReadiness() {
  const reports = [];
  for (const [name, url] of Object.entries(APP_URLS)) {
    const script =
      name === "wmos"
        ? ["run", "test:hackathon-readiness"]
        : name === "agentx"
          ? ["run", "test:hackathon-readiness"]
          : ["run", "test:hackathon-readiness"];
    const cwd = name === "agentx" ? path.join(root, "agentx") : name === "matchmind" ? path.join(root, "enagement") : root;
    const r = spawnSync("npm", script, {
      cwd,
      env: { ...process.env, BASE_URL: url },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    reports.push({ app: name, url, exitCode: r.status ?? 1, stdout: (r.stdout ?? "").slice(-2000), stderr: (r.stderr ?? "").slice(-500) });
  }
  console.log(JSON.stringify({ time: new Date().toISOString(), reports }, null, 2));
  const failed = reports.some((r) => r.exitCode !== 0);
  if (failed) process.exit(1);
}

async function cmdSubmit() {
  const slug = process.argv[3] ?? "open-innovation-track-agents";
  const telegram = process.argv[4] ?? process.env.SUPERTEAM_EARN_TELEGRAM ?? "";
  const link = process.argv[5] ?? APP_URLS.agentx;

  const listing = await earnFetch(`/api/agents/listings/details/${encodeURIComponent(slug)}`);
  const questions = listing.eligibilityQuestions ?? [];
  const eligibilityAnswers = questions.map((q) => ({
    question: q.question ?? q,
    answer: q.question?.includes("Title") ? "Superform Agent Stack" : "TxLINE AI Trader + World Cup OS + MatchMind",
  }));

  const payload = {
    listingId: listing.id,
    link,
    tweet: "",
    otherInfo:
      "TxLINE AI Trader + World Cup OS + MatchMind — autonomous agents on live sports oracle data with Solana settlement and Superteam Earn integration. " +
      "AgentX runs Alpha/Beta strategies on TxLINE SSE; World Cup OS handles on-chain prediction escrow; MatchMind triggers goal polls. " +
      `Live: ${APP_URLS.wmos} | ${APP_URLS.agentx} | ${APP_URLS.matchmind}`,
    eligibilityAnswers,
    ask: null,
  };
  if (telegram) payload.telegram = telegram;

  const result = await earnFetch("/api/agents/submissions/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(JSON.stringify({ listing: listing.title, slug, result }, null, 2));
}

async function cmdClaimInfo() {
  const claimCode = process.env.SUPERTEAM_EARN_CLAIM_CODE ?? "";
  const agentId = process.env.SUPERTEAM_EARN_AGENT_ID ?? "";
  console.log(
    JSON.stringify(
      {
        agentName: AGENT_NAME,
        agentId,
        claimUrl: claimCode ? `${BASE_URL}/earn/claim/${claimCode}` : null,
        profileUrl: `${BASE_URL}/t/${process.env.SUPERTEAM_EARN_USERNAME ?? "superform-worldcup-agent-coffee-61"}`,
        note: "Human operator must complete talent profile before claiming payouts.",
      },
      null,
      2,
    ),
  );
  if (!claimCode) process.exit(1);
}

const cmd = process.argv[2];
const handlers = { discover: cmdDiscover, heartbeat: cmdHeartbeat, readiness: cmdReadiness, submit: cmdSubmit, claim: cmdClaimInfo };

if (!cmd || !handlers[cmd]) {
  console.error("Usage: node scripts/earn-agent.mjs <discover|heartbeat|readiness|submit|claim> [args]");
  console.error("  submit [slug] [telegram] [link]");
  process.exit(1);
}

handlers[cmd]().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
