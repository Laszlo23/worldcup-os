import { useEffect, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "../store";
import { queryKeys } from "../queries/hooks";
import { apiFetch } from "../api/client";
import type { Match } from "../types";
import type { LiveEvent } from "../queries/hooks";
import { feedEventKeyFromLiveEvent } from "../live-events";
import { isToastableFeedEvent } from "../feed-event-key";

const SEEN_FEED_KEYS_KEY = "matchmind-seen-feed-keys";

function loadSeenFeedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_FEED_KEYS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function LiveProvider({ children }: { children?: ReactNode }) {
  const updateMatch = useAppStore((s) => s.updateMatch);
  const setMatches = useAppStore((s) => s.setMatches);
  const setFeaturedMatchId = useAppStore((s) => s.setFeaturedMatchId);
  const seenFeedKeys = useRef<Set<string>>(loadSeenFeedKeys());
  const feedBootstrapped = useRef(false);
  const storeMatches = useAppStore((s) => s.matches);

  const { data: matches } = useQuery({
    queryKey: queryKeys.matches,
    queryFn: async () => {
      const res = await apiFetch<{ matches: Match[] }>("/api/matches");
      return res.matches;
    },
    staleTime: 10_000,
    refetchInterval: (query) => {
      const list = query.state.data ?? storeMatches;
      const live = list.some((m) => m.status === "live" || m.status === "halftime");
      return live ? 5_000 : 15_000;
    },
  });

  const { data: featured } = useQuery({
    queryKey: queryKeys.featured,
    queryFn: async () => {
      const res = await apiFetch<{ match: Match | null }>("/api/engagement/featured");
      return res.match;
    },
    staleTime: 8_000,
    refetchInterval: 10_000,
  });

  const { data: liveEvents } = useQuery({
    queryKey: queryKeys.liveEvents(),
    queryFn: async () => {
      const res = await apiFetch<{ events: LiveEvent[] }>("/api/stream/events?limit=50");
      return res.events;
    },
    refetchInterval: 8_000,
  });

  useEffect(() => {
    if (matches?.length) setMatches(matches);
  }, [matches, setMatches]);

  useEffect(() => {
    if (featured?.id) setFeaturedMatchId(featured.id);
  }, [featured, setFeaturedMatchId]);

  useEffect(() => {
    if (!matches?.length) return;
    for (const match of matches) {
      updateMatch(match.id, match);
    }
  }, [matches, updateMatch]);

  useEffect(() => {
    if (!liveEvents?.length) return;
    const markSeen = (event: LiveEvent) => {
      const key = feedEventKeyFromLiveEvent(event);
      seenFeedKeys.current.add(key);
      return key;
    };
    if (!feedBootstrapped.current) {
      for (const event of liveEvents) markSeen(event);
      feedBootstrapped.current = true;
      return;
    }
    const newcomers = liveEvents.filter((e) => !seenFeedKeys.current.has(feedEventKeyFromLiveEvent(e)));
    for (const event of newcomers) {
      markSeen(event);
      if (!isToastableFeedEvent(event.event_type)) continue;
      toast.success(event.title, { description: event.body, id: feedEventKeyFromLiveEvent(event) });
    }
  }, [liveEvents]);

  return <>{children}</>;
}
