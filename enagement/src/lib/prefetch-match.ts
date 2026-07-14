import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/hooks";
import type { Match } from "@/lib/types";

/** Warm featured + matches queries for SSR and first client paint. */
export async function prefetchMatchFeed(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.ensureQueryData({
      queryKey: queryKeys.featured,
      queryFn: async () => {
        const res = await apiFetch<{ match: Match | null }>("/api/engagement/featured");
        return res.match;
      },
      staleTime: 8_000,
    }),
    queryClient.ensureQueryData({
      queryKey: queryKeys.matches,
      queryFn: async () => {
        const res = await apiFetch<{ matches: Match[] }>("/api/matches");
        return res.matches;
      },
      staleTime: 10_000,
    }),
  ]);
}
