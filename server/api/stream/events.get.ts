import { defineHandler } from "nitro";
import { hasDatabase } from "@/server/config/env";
import { maybeOne, query } from "@/server/db/postgres";
import { errorResponse, jsonResponse, rateLimit, getQueryParam } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "live-events"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");
  const limit = Number(getQueryParam(event, "limit") ?? 50);

  if (!hasDatabase()) {
    return jsonResponse({ events: [] });
  }

  let matchUuid: string | null = null;
  if (matchId) {
    const match = await maybeOne<{ id: string }>("select id from matches where external_id = $1", [matchId]);
    matchUuid = match?.id ?? null;
  }

  try {
    const data = await query(
      `
        select id, event_type, title, body, created_at
        from live_events
        where ($1::uuid is null or match_id = $1)
        order by created_at desc
        limit $2
      `,
      [matchUuid, limit],
    );
    return jsonResponse({ events: data });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load live events", 500);
  }
});
