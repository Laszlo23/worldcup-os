import { defineHandler } from "nitro";
import { getUsdcBalance } from "@shared/server/services/auth";
import { errorResponse, jsonResponse, rateLimit, getSessionWallet } from "@shared/server/middleware/http";

export default defineHandler(async (event) => {
  if (!(await rateLimit(event, "auth-session", 60))) return errorResponse("Rate limit exceeded", 429);
  const wallet = await getSessionWallet(event);
  if (!wallet) return errorResponse("Not authenticated", 401);
  const balance = await getUsdcBalance(wallet);
  return jsonResponse({ wallet, balance, network: "devnet" });
});
