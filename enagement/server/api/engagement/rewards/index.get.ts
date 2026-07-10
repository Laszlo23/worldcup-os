import { defineHandler } from "nitro";
import { listRewardCatalog } from "@shared/server/repositories/engagement";
import { jsonResponse, rateLimit, errorResponse } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-rewards"))) return errorResponse("Rate limit exceeded", 429);
  return jsonResponse({ rewards: listRewardCatalog() });
});
