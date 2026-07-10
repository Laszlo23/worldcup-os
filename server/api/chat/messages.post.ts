import { defineHandler } from "nitro";
import { hasDatabase } from "@/server/config/env";
import { createChatMessage } from "@/server/repositories/chat";
import { errorResponse, jsonResponse, rateLimit, readJsonBody, requireSession, requireMutationOrigin } from "@/server/middleware/http";
import { postChatMessageSchema } from "@/lib/validators/api";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "chat-post", 30, 60_000))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);

  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  if (!hasDatabase()) return errorResponse("Database unavailable", 503);

  try {
    const raw = await readJsonBody(event);
    const parsed = postChatMessageSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Invalid message", 400);
    }

    const message = await createChatMessage(wallet, parsed.data.body);
    return jsonResponse({ message }, 201);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to send message", 500);
  }
});
