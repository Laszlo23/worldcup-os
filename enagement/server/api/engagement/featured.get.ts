import { defineHandler } from "nitro";
import { listMatches } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-featured"))) return errorResponse("Rate limit exceeded", 429);
  try {
    const matches = await listMatches();
    const live =
      matches.find((m) => m.status === "live" || m.status === "halftime") ??
      matches.find((m) => m.status === "scheduled") ??
      matches[0] ??
      null;
    return jsonResponse({ match: live });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
