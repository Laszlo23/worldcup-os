import { defineHandler } from "nitro";
import { errorResponse, rateLimit, requireWorkerSecret } from "@/server/middleware/http";
import { runWorkerTick } from "@/server/workers/runner";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "worker-tick", 120, 60_000))) return errorResponse("Rate limit exceeded", 429);
  if (!requireWorkerSecret(event)) return errorResponse("Unauthorized", 401);
  const result = await runWorkerTick();
  return result;
});
