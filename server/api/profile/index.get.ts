import { defineHandler } from "nitro";
import { hasDatabase } from "@/server/config/env";
import { getProfileByWallet } from "@/server/repositories/profile";
import { getPortfolioSummary } from "@/server/services/auth";
import { errorResponse, jsonResponse, rateLimit, requireSession } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "profile"))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await requireSession(event);
  if (wallet instanceof Response) return wallet;

  if (!hasDatabase()) return errorResponse("Database unavailable", 503);

  const profile = await getProfileByWallet(wallet);
  if (!profile) return errorResponse("Profile not found", 404);

  const portfolio = await getPortfolioSummary(wallet);

  return jsonResponse({
    profile,
    portfolio: {
      balance: portfolio.balance,
      inEscrow: portfolio.inEscrow,
      pendingRewards: portfolio.pendingRewards,
      totalEarnings: portfolio.totalEarnings,
      openCount: portfolio.open.length,
      wonCount: portfolio.won.length,
    },
  });
});
