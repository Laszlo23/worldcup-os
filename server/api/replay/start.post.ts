import { defineHandler } from "nitro";
import { replayStartSchema } from "@/lib/validators/api";
import { buildOfflineReplaySession } from "@/lib/replay-presets";
import { txlineClient } from "@/server/services/txline/client";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireMutationOrigin } from "@/server/middleware/http";

const REPLAY_DURATION_MS = 90_000;

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "replay"))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  const body = await readJsonBody<unknown>(event);
  const parsed = replayStartSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const { fixtureId, matchExternalId } = parsed.data;

  try {
    const historical = await txlineClient.getHistoricalScores(fixtureId);
    if (historical.length) {
      const total = historical.length;
      const events = historical.map((update, index) => ({
        atMs: Math.floor((index / Math.max(total - 1, 1)) * REPLAY_DURATION_MS),
        payload: update,
      }));

      return jsonResponse({
        session: {
          matchId: matchExternalId ?? `fx-${fixtureId}`,
          fixtureId,
          durationMs: REPLAY_DURATION_MS,
          events,
          source: "txline",
        },
      });
    }
  } catch {
    // fall through to offline preset
  }

  return jsonResponse(buildOfflineReplaySession(fixtureId, matchExternalId));
});
