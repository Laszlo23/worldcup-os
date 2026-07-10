import { useEffect, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "../store";
import { queryKeys } from "../queries/hooks";
import { apiFetch } from "../api/client";
import type { Match } from "../mock/types";
import type { LiveEvent } from "../queries/hooks";
import { feedEventKeyFromLiveEvent } from "../live-events";
import { isToastableFeedEvent } from "../feed-event-key";

const SEEN_FEED_KEYS_KEY = "wmos-seen-feed-keys";

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

function persistSeenFeedKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  const trimmed = [...keys].slice(-200);
  sessionStorage.setItem(SEEN_FEED_KEYS_KEY, JSON.stringify(trimmed));
}

/**
 * LiveProvider — hydrates matches + oracle feed.
 * Toasts only fire once per logical event (goal seq, settlement, etc.), never on history replay.
 */
export function LiveProvider({ children }: { children?: ReactNode }) {
  const updateMatch = useAppStore((s) => s.updateMatch);
  const setMatches = useAppStore((s) => s.setMatches);
  const incrementFeedUnread = useAppStore((s) => s.incrementFeedUnread);
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
      for (const event of liveEvents) {
        markSeen(event);
      }
      feedBootstrapped.current = true;
      persistSeenFeedKeys(seenFeedKeys.current);
      return;
    }

    const newcomers = liveEvents.filter((event) => !seenFeedKeys.current.has(feedEventKeyFromLiveEvent(event)));
    if (!newcomers.length) return;

    for (const event of newcomers.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )) {
      markSeen(event);
      if (!isToastableFeedEvent(event.event_type)) continue;
      incrementFeedUnread();
      if (event.event_type === "goal") {
        toast.success(event.title, { description: event.body, id: feedEventKeyFromLiveEvent(event) });
      } else {
        toast.success(event.title, { description: event.body, id: feedEventKeyFromLiveEvent(event) });
      }
    }

    persistSeenFeedKeys(seenFeedKeys.current);
  }, [liveEvents, incrementFeedUnread]);

  return <>{children}</>;
}
