import { defineHandler } from "nitro";
import { clearSessionCookie } from "@/server/services/session";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "auth-logout", 30))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  return jsonResponse({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
});
