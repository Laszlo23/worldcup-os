import { defineHandler } from "nitro";
import { earnClient } from "@/server/services/earn/client";

export default defineHandler(async (event) => {
  if (event.method === "HEAD") {
    return new Response(null, { status: 200 });
  }

  if (!earnClient.hasCredentials()) {
    return { listings: [], error: "SUPERTEAM_EARN_API_KEY not configured" };
  }
  const query = event.url.searchParams;
  const take = Number(query.get("take") ?? "20");
  const type = query.get("type") ?? undefined;
  const listings = await earnClient.listLiveListings({ take, type: type ?? undefined });
  return { listings, count: listings.length };
});
