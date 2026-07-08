import { defineHandler } from "nitro";
import { listMatches } from "@/server/repositories/matches";
import { LiveDataRequiredError } from "@/server/config/env";
import { errorResponse, jsonResponse, rateLimit } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "matches"))) return errorResponse("Rate limit exceeded", 429);
  try {
    const matches = await listMatches();
    return jsonResponse({ matches });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
