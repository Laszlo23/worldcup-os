import { defineHandler } from "nitro";
import { z } from "zod";
import { completeTask } from "@/server/repositories/superfan";
import { LiveDataRequiredError } from "@/server/config/env";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireMutationOrigin, requireSession } from "@/server/middleware/http";

const bodySchema = z.object({
  taskId: z.string().min(1).max(64),
});

export default defineHandler(async (event) => {
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "superfan-task", 20))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  const parsed = bodySchema.safeParse(await readJsonBody(event));
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  try {
    const result = await completeTask(wallet, parsed.data.taskId);
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid task") return errorResponse(err.message, 400);
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
