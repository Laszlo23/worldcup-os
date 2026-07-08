import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "../store";
import { queryKeys } from "../queries/hooks";
import { apiFetch } from "../api/client";
import type { Match } from "../mock/types";

/**
 * LiveProvider — replaces MockLiveProvider.
 * Hydrates Zustand from React Query polling + live event polling.
 */
export function LiveProvider() {
  const updateMatch = useAppStore((s) => s.updateMatch);
  const setMatches = useAppStore((s) => s.setMatches);
  const seenLiveEvents = useRef<Set<string>>(new Set());

  const { data: matches } = useQuery({
    queryKey: queryKeys.matches,
    queryFn: async () => {
      const res = await apiFetch<{ matches: Match[] }>("/api/matches");
      return res.matches;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const { data: liveEvents } = useQuery({
    queryKey: queryKeys.liveEvents(),
    queryFn: async () => {
      const res = await apiFetch<{ events: { id: string; event_type: string; title: string; body: string }[] }>(
        "/api/stream/events?limit=10",
      );
      return res.events;
    },
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (matches?.length) setMatches(matches);
  }, [matches, setMatches]);

  useEffect(() => {
    if (!matches?.length) return;
    for (const match of matches) {
      updateMatch(match.id, match);
    }
  }, [matches, updateMatch]);

  useEffect(() => {
    if (!liveEvents?.length) return;
    for (const event of [...liveEvents].reverse()) {
      if (seenLiveEvents.current.has(event.id)) continue;
      seenLiveEvents.current.add(event.id);
      if (event.event_type === "goal") {
        toast.success(event.title, { description: event.body });
      } else if (event.event_type === "settlement_finished") {
        toast.success(event.title, { description: event.body });
      } else if (event.event_type === "odds_update") {
        toast.info(event.title, { description: event.body });
      }
    }
  }, [liveEvents]);

  return null;
}
