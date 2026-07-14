import { defineHandler } from "nitro";
import { getTrust8004Asset, getTrust8004Reputation } from "@/server/services/trust8004/client";
import { jsonResponse } from "@/server/middleware/http";

export default defineHandler(async (event) => {
  const url = new URL(event.req.url);
  const asset = url.searchParams.get("asset") ?? getTrust8004Asset() ?? undefined;
  const reputation = await getTrust8004Reputation(asset);
  return jsonResponse({ reputation });
});
