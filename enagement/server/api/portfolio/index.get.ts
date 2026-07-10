import { defineHandler } from "nitro";
import { getPortfolioSummary } from "@shared/server/services/auth";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "portfolio"))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;
  const portfolio = await getPortfolioSummary(wallet);
  return jsonResponse({ portfolio });
});
