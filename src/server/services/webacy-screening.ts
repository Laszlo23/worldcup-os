import { ThreatClient, Chain } from "@webacy-xyz/sdk-threat";
import { env, hasWebacy } from "../config/env";

export type ScreenContext = "login" | "deposit" | "withdraw" | "faucet" | "internal";

export type ScreenResult =
  | { allowed: true; riskScore?: number; sanctioned: false; skipped?: boolean }
  | { allowed: false; reason: string; sanctioned?: boolean; riskScore?: number };

const CACHE_TTL_MS = 10 * 60 * 1000;
const HIGH_RISK_LOG_THRESHOLD = 50;

type CacheEntry = { result: ScreenResult; expiresAt: number };

const cache = new Map<string, CacheEntry>();

let client: ThreatClient | null = null;

function getClient(): ThreatClient | null {
  if (!hasWebacy()) return null;
  if (!client) {
    client = new ThreatClient({
      apiKey: env.webacyApiKey,
      defaultChain: Chain.SOL,
    });
  }
  return client;
}

function cacheKey(pubkey: string): string {
  return pubkey.trim();
}

function readCache(pubkey: string): ScreenResult | null {
  const entry = cache.get(cacheKey(pubkey));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey(pubkey));
    return null;
  }
  return entry.result;
}

function writeCache(pubkey: string, result: ScreenResult): void {
  cache.set(cacheKey(pubkey), { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

function logScreen(pubkey: string, context: ScreenContext, payload: Record<string, unknown>): void {
  console.info(
    JSON.stringify({
      event: "webacy_screen",
      pubkey,
      context,
      ...payload,
    }),
  );
}

export async function screenWallet(pubkey: string, context: ScreenContext): Promise<ScreenResult> {
  const trimmed = pubkey.trim();
  const cached = readCache(trimmed);
  if (cached) return cached;

  const webacy = getClient();
  if (!webacy) {
    const skipped: ScreenResult = { allowed: true, sanctioned: false, skipped: true };
    logScreen(trimmed, context, { action: "allow", skipped: true, reason: "webacy_unavailable" });
    return skipped;
  }

  try {
    const sanctions = await webacy.addresses.checkSanctioned(trimmed, { chain: Chain.SOL });
    if (sanctions.is_sanctioned) {
      const blocked: ScreenResult = {
        allowed: false,
        reason: "Wallet not permitted — sanctions screening failed",
        sanctioned: true,
      };
      writeCache(trimmed, blocked);
      logScreen(trimmed, context, { action: "block", sanctioned: true });
      return blocked;
    }

    let riskScore: number | undefined;
    try {
      const risk = await webacy.addresses.analyze(trimmed, { chain: Chain.SOL });
      riskScore = typeof risk.overallRisk === "number" ? risk.overallRisk : undefined;
      if (riskScore !== undefined && riskScore > HIGH_RISK_LOG_THRESHOLD) {
        logScreen(trimmed, context, {
          action: "allow",
          sanctioned: false,
          overallRisk: riskScore,
          warning: "high_risk_wallet",
        });
      }
    } catch (riskErr) {
      logScreen(trimmed, context, {
        action: "allow",
        sanctioned: false,
        skipped: true,
        reason: "risk_analysis_failed",
        detail: riskErr instanceof Error ? riskErr.message : "unknown",
      });
    }

    const allowed: ScreenResult = { allowed: true, sanctioned: false, riskScore };
    writeCache(trimmed, allowed);
    logScreen(trimmed, context, {
      action: "allow",
      sanctioned: false,
      overallRisk: riskScore ?? null,
    });
    return allowed;
  } catch (err) {
    const skipped: ScreenResult = { allowed: true, sanctioned: false, skipped: true };
    logScreen(trimmed, context, {
      action: "allow",
      skipped: true,
      reason: "webacy_error",
      detail: err instanceof Error ? err.message : "unknown",
    });
    return skipped;
  }
}
