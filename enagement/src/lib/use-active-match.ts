import { useAppStore } from "@/lib/store";
import { useFeaturedMatch, useMatches } from "@/lib/queries/hooks";
import type { Match } from "@/lib/types";

export function useActiveMatchId(): string | null {
  const featuredMatchId = useAppStore((s) => s.featuredMatchId);
  const { data: featured } = useFeaturedMatch();
  return featuredMatchId ?? featured?.id ?? null;
}

export type ActiveMatchState = {
  match: Match | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export function useActiveMatchState(): ActiveMatchState {
  const featuredMatchId = useAppStore((s) => s.featuredMatchId);
  const storeMatches = useAppStore((s) => s.matches);
  const {
    data: featured,
    isPending: featuredPending,
    isError: featuredError,
    refetch: refetchFeatured,
  } = useFeaturedMatch();
  const {
    data: matches,
    isPending: matchesPending,
    isError: matchesError,
    refetch: refetchMatches,
  } = useMatches();

  const id = featuredMatchId ?? featured?.id ?? null;
  const allMatches = matches?.length ? matches : storeMatches;
  const match = id
    ? allMatches.find((m) => m.id === id) ?? featured ?? null
    : featured ?? null;

  const isLoading = (featuredPending || matchesPending) && !match;
  const isError = (featuredError || matchesError) && !match;

  return {
    match,
    isLoading,
    isError,
    refetch: () => {
      void refetchFeatured();
      void refetchMatches();
    },
  };
}

export function useActiveMatch(): Match | null {
  return useActiveMatchState().match;
}
