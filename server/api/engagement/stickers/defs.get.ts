import { defineHandler } from "nitro";
import { listStickerDefs } from "@/server/repositories/engagement";
import { LiveDataRequiredError } from "@/server/config/env";
import { errorResponse, jsonResponse, rateLimit } from "@/server/middleware/http";

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
