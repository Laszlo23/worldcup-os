import { defineHandler } from "nitro";
import { z } from "zod";
import { enqueueJob } from "@/server/repositories/matches";
import {
  errorResponse,
  jsonResponse,
  rateLimit,
  readJsonBody,
  requireWorkerSecret,
  requireSession,
  requireAdmin,
  requireMutationOrigin,
} from "@/server/middleware/http";

const settleSchema = z.object({
  matchExternalId: z.string().min(1),
  fixtureId: z.number().int().positive(),
});

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "replay-settle", 20))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);

  const workerOk = requireWorkerSecret(event);
  if (!workerOk) {
    const wallet = await requireSession(event);
    if (wallet instanceof Response) return errorResponse("Authentication required", 401);
    if (!requireAdmin(wallet)) return errorResponse("Forbidden", 403);
  }

  const body = await readJsonBody<unknown>(event);
  const parsed = settleSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  await enqueueJob("settlement", {
    matchExternalId: parsed.data.matchExternalId,
    fixtureId: parsed.data.fixtureId,
  });

  return jsonResponse({ ok: true, queued: true });
});
