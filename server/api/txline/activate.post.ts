import { defineHandler } from "nitro";
import { z } from "zod";
import { activateApiToken } from "@/server/services/txline/activation";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession, requireAdmin } from "@/server/middleware/http";

const activateSchema = z.object({
  txSig: z.string().min(1),
  walletSignature: z.string().min(1),
});

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "txline-activate", 10))) return errorResponse("Rate limit exceeded", 429);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;
  if (!requireAdmin(wallet)) return errorResponse("Admin access required", 403);

  const body = await readJsonBody<unknown>(event);
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.message, 400);

  try {
    const result = await activateApiToken(parsed.data);
    return jsonResponse({
      ok: true,
      serviceLevel: Number(process.env.TXLINE_SERVICE_LEVEL ?? 12),
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Activation failed", 502);
  }
});
