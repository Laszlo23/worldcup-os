import { defineHandler } from "nitro";
import {
  getAutoAgentPrefs,
  setAutoAgentPrefs,
  runAutoAgentTick,
  recordAutoAgentUsdcSpend,
  markAutoAgentVotes,
} from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  requireSession,
  requireMutationOrigin,
  readJsonBody,
  getQueryParam,
} from "@shared/server/middleware/http";

const AGENTX_URL = (
  process.env.AGENTX_URL ??
  process.env.VITE_AGENTX_URL ??
  "https://agentx.buildingcultureid.space"
).replace(/\/$/, "");

async function fetchSignals(matchId?: string) {
  try {
    const qs = new URLSearchParams({ limit: "8" });
    if (matchId) qs.set("matchId", matchId);
    const res = await fetch(`${AGENTX_URL}/api/signals?${qs}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      signals?: {
        matchId: string;
        headline: string;
        prediction: string;
        confidence: number;
        type: string;
      }[];
    };
    return data.signals ?? [];
  } catch {
    return [];
  }
}

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "engagement-auto-agent-mutate"))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const body = await readJsonBody<{
    action?: string;
    enabled?: boolean;
    mode?: "agent" | "crowd";
    matchId?: string;
    usdcMarkets?: boolean;
    usdcBudget?: number;
    usdcStake?: number;
    amount?: number;
    votesLocked?: number;
  }>(event);

  try {
    const user = await upsertUser(wallet);

    if (body?.action === "tick") {
      const matchId = body.matchId ?? getQueryParam(event, "matchId") ?? undefined;
      const signals = await fetchSignals(matchId);
      const result = await runAutoAgentTick(user.id, {
        matchExternalId: matchId,
        signals,
      });
      return jsonResponse({ ok: true, ...result });
    }

    if (body?.action === "record-usdc") {
      const amount = Number(body.amount);
      const result = await recordAutoAgentUsdcSpend(user.id, amount);
      if ("ok" in result && result.ok === false) {
        return errorResponse(result.reason, 400);
      }
      return jsonResponse({ ok: true, prefs: result });
    }

    if (body?.action === "record-votes") {
      await markAutoAgentVotes(user.id, Number(body.votesLocked ?? 0));
      return jsonResponse({ ok: true });
    }

    const hasPrefsPatch =
      typeof body?.enabled === "boolean" ||
      typeof body?.usdcMarkets === "boolean" ||
      typeof body?.usdcBudget === "number" ||
      typeof body?.usdcStake === "number" ||
      Boolean(body?.mode);

    if (hasPrefsPatch) {
      const current = await getAutoAgentPrefs(user.id);
      const prefs = await setAutoAgentPrefs(user.id, {
        enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
        mode: body.mode ?? current.mode,
        usdcMarkets: body.usdcMarkets,
        usdcBudget: body.usdcBudget,
        usdcStake: body.usdcStake,
      });
      return jsonResponse({ ok: true, prefs });
    }

    return errorResponse("Provide enabled, budget fields, or action=tick", 400);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
