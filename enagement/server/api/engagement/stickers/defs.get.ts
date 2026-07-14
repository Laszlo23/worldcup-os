import { defineHandler } from "nitro";
import { listStickerDefs } from "@shared/server/repositories/engagement";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-stickers"))) return errorResponse("Rate limit exceeded", 429);
  try {
    const defs = await listStickerDefs();
    return jsonResponse({ defs });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
