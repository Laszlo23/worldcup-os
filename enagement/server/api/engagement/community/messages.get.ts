import { defineHandler } from "nitro";
import { listFanMessages } from "@shared/server/repositories/engagement";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { clampQueryLimit, errorResponse, getQueryParam, jsonResponse, rateLimit } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-fan-messages"))) return errorResponse("Rate limit exceeded", 429);

  const matchId = getQueryParam(event, "matchId");
  if (!matchId) return errorResponse("matchId required", 400);
  const limit = clampQueryLimit(getQueryParam(event, "limit"), 60, 100);

  try {
    const messages = await listFanMessages(matchId, limit);
    return jsonResponse({ messages });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
