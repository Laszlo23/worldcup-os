import { defineHandler } from "nitro";
import { replayStartSchema } from "@/lib/validators/api";
import { txlineClient } from "@/server/services/txline/client";
import { errorResponse, jsonResponse, rateLimit, readJsonBody } from "@/server/middleware/http";

const REPLAY_DURATION_MS = 90_000;

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "replay"))) return errorResponse("Rate limit exceeded", 429);
  const body = await readJsonBody<unknown>(event);
  const parsed = replayStartSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const historical = await txlineClient.getHistoricalScores(parsed.data.fixtureId);
  if (!historical.length) {
    return errorResponse("No historical data for fixture", 404);
  }

  const total = historical.length;
  const events = historical.map((update, index) => ({
    atMs: Math.floor((index / Math.max(total - 1, 1)) * REPLAY_DURATION_MS),
    payload: update,
  }));

  return jsonResponse({
    session: {
      matchId: parsed.data.matchExternalId ?? `fx-${parsed.data.fixtureId}`,
      fixtureId: parsed.data.fixtureId,
      durationMs: REPLAY_DURATION_MS,
      events,
    },
  });
});
