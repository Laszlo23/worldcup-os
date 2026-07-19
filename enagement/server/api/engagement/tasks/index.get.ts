import { defineHandler } from "nitro";
import { listCommunityTasks } from "@shared/server/repositories/engagement";
import { upsertUser } from "@shared/server/repositories/matches";
import { LiveDataRequiredError } from "@shared/server/config/env";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "engagement-tasks"))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  try {
    const user = await upsertUser(wallet);
    const tasks = await listCommunityTasks(user.id);
    return jsonResponse({ tasks });
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
