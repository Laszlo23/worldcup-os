import { defineHandler } from "nitro";
import { setAutoAgentPrefs, runAutoAgentTick } from "@shared/server/repositories/engagement";
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

    if (typeof body?.enabled === "boolean") {
      const prefs = await setAutoAgentPrefs(user.id, {
        enabled: body.enabled,
        mode: body.mode,
      });
      return jsonResponse({ ok: true, prefs });
    }

    return errorResponse("Provide enabled or action=tick", 400);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
