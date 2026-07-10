import { defineHandler } from "nitro";
import { hasDatabase } from "@/server/config/env";
import { listChatMessages } from "@/server/repositories/chat";
import { errorResponse, getQueryParam, jsonResponse, rateLimit } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "chat-messages"))) return errorResponse("Rate limit exceeded", 429);

  const limit = Math.min(100, Math.max(1, Number(getQueryParam(event, "limit") ?? 50)));

  if (!hasDatabase()) {
    return jsonResponse({ messages: [] });
  }

  try {
    const messages = await listChatMessages(limit);
    return jsonResponse({ messages });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Failed to load chat messages", 500);
  }
});
