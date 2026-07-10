import { useAppStore } from "@/lib/store";
import { useFeaturedMatch } from "@/lib/queries/hooks";

export function useActiveMatchId(): string | null {
  const featuredMatchId = useAppStore((s) => s.featuredMatchId);
  const { data: featured } = useFeaturedMatch();
  return featuredMatchId ?? featured?.id ?? null;
}

export function useActiveMatch() {
  const id = useActiveMatchId();
  const matches = useAppStore((s) => s.matches);
  const { data: featured } = useFeaturedMatch();
  if (!id) return featured ?? null;
  return matches.find((m) => m.id === id) ?? featured ?? null;
}
