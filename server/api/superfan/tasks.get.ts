import { defineHandler } from "nitro";
import { listCompletedTasks } from "@/server/repositories/superfan";
import { LiveDataRequiredError } from "@/server/config/env";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "superfan-tasks"))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  try {
    const completedTaskIds = await listCompletedTasks(wallet);
    return jsonResponse({ completedTaskIds });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
