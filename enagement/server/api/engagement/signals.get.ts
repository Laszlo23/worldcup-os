import { defineHandler } from "nitro";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  getQueryParam,
} from "@shared/server/middleware/http";

const AGENTX_URL = (
  process.env.AGENTX_URL ??
  process.env.VITE_AGENTX_URL ??
  "https://agentx.buildingcultureid.space"
).replace(/\/$/, "");

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-signals"))) {
    return errorResponse("Rate limit exceeded", 429);
  }

  const matchId = getQueryParam(event, "matchId");
  const limit = Math.min(20, Math.max(1, Number(getQueryParam(event, "limit") ?? "5") || 5));

  const qs = new URLSearchParams({ limit: String(limit) });
  if (matchId) qs.set("matchId", matchId);

  try {
    const res = await fetch(`${AGENTX_URL}/api/signals?${qs.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) {
      return jsonResponse({ signals: [], source: "agentx", ok: false });
    }
    const data = (await res.json()) as {
      signals?: {
        id: string;
        matchId: string;
        type: string;
        headline: string;
        prediction: string;
        confidence: number;
        impact?: string;
        createdAt?: string;
      }[];
    };
    return jsonResponse({
      signals: (data.signals ?? []).map((s) => ({
        id: s.id,
        matchId: s.matchId,
        type: s.type,
        headline: s.headline,
        prediction: s.prediction,
        confidence: s.confidence,
        impact: s.impact ?? null,
        createdAt: s.createdAt ?? null,
      })),
      source: "agentx",
      ok: true,
    });
  } catch {
    return jsonResponse({ signals: [], source: "agentx", ok: false });
  }
});
