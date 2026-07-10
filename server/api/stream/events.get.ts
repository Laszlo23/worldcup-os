import { defineHandler } from "nitro";
import { hasDatabase } from "@/server/config/env";
import { maybeOne, query } from "@/server/db/postgres";
import { errorResponse, jsonResponse, rateLimit, getQueryParam, clampQueryLimit } from "@/server/middleware/http";

const FEED_EVENT_TYPES = ["goal", "settlement_started", "settlement_finished", "proof_verified"] as const;

const PIPELINE_EVENT_TYPES = [
  ...FEED_EVENT_TYPES,
  "odds_update",
  "market_closing",
  "kickoff_waiting",
  "tx_confirmed",
] as const;

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "live-events"))) return errorResponse("Rate limit exceeded", 429);
  const matchId = getQueryParam(event, "matchId");
  const scope = getQueryParam(event, "scope") === "pipeline" ? "pipeline" : "feed";
  const limit = clampQueryLimit(getQueryParam(event, "limit"), 50, scope === "pipeline" ? 200 : 100);
  const allowedTypes = scope === "pipeline" ? PIPELINE_EVENT_TYPES : FEED_EVENT_TYPES;

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
        select id, event_type, title, body, payload, created_at, match_id
        from (
          select distinct on (
            coalesce(
              le.payload->>'feedKey',
              case
                when le.event_type = 'goal' and le.payload->>'seq' is not null
                  then 'goal:' || le.match_id::text || ':' || (le.payload->>'seq')
                when le.event_type = 'goal'
                  then 'goal:' || le.match_id::text || ':' || coalesce(le.body, le.id::text)
                when le.event_type in ('settlement_started', 'settlement_finished', 'proof_verified')
                  then le.event_type || ':' || le.match_id::text
                when le.event_type = 'odds_update' and le.payload->>'predictionId' is not null
                  then 'prediction:' || (le.payload->>'predictionId')
                else le.id::text
              end
            )
          )
            le.id, le.event_type, le.title, le.body, le.payload, le.created_at, le.match_id
          from live_events le
          where ($1::uuid is null or le.match_id = $1)
            and coalesce(le.source, 'txline') <> 'demo'
            and le.event_type = any($3::text[])
          order by
            coalesce(
              le.payload->>'feedKey',
              case
                when le.event_type = 'goal' and le.payload->>'seq' is not null
                  then 'goal:' || le.match_id::text || ':' || (le.payload->>'seq')
                when le.event_type = 'goal'
                  then 'goal:' || le.match_id::text || ':' || coalesce(le.body, le.id::text)
                when le.event_type in ('settlement_started', 'settlement_finished', 'proof_verified')
                  then le.event_type || ':' || le.match_id::text
                when le.event_type = 'odds_update' and le.payload->>'predictionId' is not null
                  then 'prediction:' || (le.payload->>'predictionId')
                else le.id::text
              end
            ),
            le.created_at asc
        ) deduped
        order by created_at asc
        limit $2
      `,
      [matchUuid, limit, allowedTypes],
    );
    return jsonResponse({ events: data });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load live events", 500);
  }
});
