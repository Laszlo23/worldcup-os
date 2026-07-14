import { defineHandler } from "nitro";
import { z } from "zod";
import { awardSuperfanPoints } from "@/server/repositories/superfan";
import { LiveDataRequiredError } from "@/server/config/env";
import { screenWallet } from "@/server/services/webacy-screening";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireWorkerSecret } from "@/server/middleware/http";

const bodySchema = z.object({
  walletPubkey: z.string().min(32).max(64),
  source: z.enum(["share", "task", "passport", "agent_deploy", "agent_win"]),
  app: z.enum(["wmos", "agentx", "matchmind"]),
  points: z.number().int().positive().max(10_000),
  channel: z.string().optional(),
  contentType: z.string().optional(),
  contentId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(256),
  metadata: z.record(z.unknown()).optional(),
});

export default defineHandler(async (event) => {
  if (!requireWorkerSecret(event)) return errorResponse("Forbidden", 403);
  if (!(await rateLimit(event, "superfan-internal", 120))) return errorResponse("Rate limit exceeded", 429);

  const parsed = bodySchema.safeParse(await readJsonBody(event));
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  const screening = await screenWallet(parsed.data.walletPubkey, "internal");
  if (!screening.allowed) return errorResponse(screening.reason, 403);

  try {
    const result = await awardSuperfanPoints(parsed.data);
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof LiveDataRequiredError) return errorResponse(err.message, 503);
    throw err;
  }
});
