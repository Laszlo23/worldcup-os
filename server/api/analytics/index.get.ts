import { defineHandler } from "nitro";
import { getAnalyticsSnapshot, getPlatformStats } from "@/server/services/analytics";
import { errorResponse, jsonResponse, rateLimit } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "analytics"))) return errorResponse("Rate limit exceeded", 429);
  const analytics = await getAnalyticsSnapshot();
  return jsonResponse({ analytics });
});
