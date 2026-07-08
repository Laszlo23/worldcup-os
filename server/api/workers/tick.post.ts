import { defineHandler } from "nitro";
import { errorResponse, requireWorkerSecret } from "@/server/middleware/http";
import { runWorkerTick } from "@/server/workers/runner";

export default defineHandler(async (event) => {
  if (!requireWorkerSecret(event)) return errorResponse("Unauthorized", 401);
  const result = await runWorkerTick();
  return result;
});
