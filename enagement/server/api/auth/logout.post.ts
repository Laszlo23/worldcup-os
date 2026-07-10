import { defineHandler } from "nitro";
import { clearSessionCookie } from "@shared/server/services/session";
import { errorResponse, jsonResponse, rateLimit, requireMutationOrigin } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "auth-logout", 30))) return errorResponse("Rate limit exceeded", 429);
  if (!requireMutationOrigin(event)) return errorResponse("Forbidden", 403);
  // Always clear cookie — session may already be expired when reconnecting
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
});
