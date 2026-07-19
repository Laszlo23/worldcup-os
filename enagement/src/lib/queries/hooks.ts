import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Match, Market } from "@/lib/types";

export const queryKeys = {
  health: ["health"] as const,
  featured: ["featured"] as const,
  matches: ["matches"] as const,
  match: (id: string) => ["match", id] as const,
  markets: (matchId?: string) => ["markets", matchId ?? "all"] as const,
  polls: (matchId?: string) => ["polls", matchId ?? "all"] as const,
  myXpVotes: ["myXpVotes"] as const,
  myPredictions: ["myPredictions"] as const,
  moments: (matchId?: string) => ["moments", matchId ?? "all"] as const,
  passport: ["passport"] as const,
  stickerAlbum: ["stickerAlbum"] as const,
  rewards: ["rewards"] as const,
  liveEvents: (matchId?: string) => ["liveEvents", matchId ?? "all"] as const,
  stadium: (matchId?: string) => ["stadium", matchId ?? "all"] as const,
  proofs: ["proofs"] as const,
  community: (matchId?: string) => ["community", matchId ?? "all"] as const,
  fanMessages: (matchId?: string) => ["fanMessages", matchId ?? "all"] as const,
  signals: (matchId?: string) => ["signals", matchId ?? "all"] as const,
  wishes: ["wishes"] as const,
  marketListings: ["marketListings"] as const,
  marketInventory: ["marketInventory"] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiFetch<Record<string, unknown>>("/api/health"),
    staleTime: 30_000,
  });
}

export function useFeaturedMatch() {
  return useQuery({
    queryKey: queryKeys.featured,
    queryFn: async () => {
      const res = await apiFetch<{ match: Match | null }>("/api/engagement/featured");
      return res.match;
    },
    staleTime: 8_000,
    refetchInterval: 10_000,
  });
}

export function useMatches() {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: async () => {
      const res = await apiFetch<{ matches: Match[] }>("/api/matches");
      return res.matches;
    },
    staleTime: 10_000,
    refetchInterval: 12_000,
  });
}

export function useMatchDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.match(id),
    queryFn: async () => {
      const res = await apiFetch<{ match: Match; markets: Market[] }>(`/api/matches/${id}`);
      return res;
    },
    enabled: Boolean(id),
    staleTime: 3_000,
    refetchInterval: 5_000,
  });
}

export function useMarkets(matchId?: string) {
  return useQuery({
    queryKey: queryKeys.markets(matchId),
    queryFn: async () => {
      const qs = matchId ? `?matchId=${matchId}&bettable=true` : "";
      const res = await apiFetch<{ markets: Market[] }>(`/api/markets${qs}`);
      return res.markets;
    },
    enabled: Boolean(matchId),
    staleTime: 8_000,
  });
}

export interface LiveEvent {
  id: string;
  event_type: string;
  title: string;
  body: string;
  created_at: string;
  match_id?: string | null;
}

export function useLiveEvents(matchId?: string) {
  return useQuery({
    queryKey: queryKeys.liveEvents(matchId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (matchId) params.set("matchId", matchId);
      params.set("limit", "50");
      const res = await apiFetch<{ events: LiveEvent[] }>(`/api/stream/events?${params.toString()}`);
      return res.events;
    },
    refetchInterval: 6_000,
  });
}

export interface EngagementPoll {
  id: string;
  matchId: string;
  question: string;
  window: string;
  countdown: number;
  yesReward: number;
  noReward: number;
  probability: number;
  voters: number;
  yesVotes?: number;
  noVotes?: number;
  userChoice?: "yes" | "no" | null;
  outcome: string | null;
  resolved: boolean;
}

export function useEngagementPolls(matchId?: string) {
  return useQuery({
    queryKey: queryKeys.polls(matchId),
    queryFn: async () => {
      const qs = matchId ? `?matchId=${matchId}` : "";
      const res = await apiFetch<{ polls: EngagementPoll[] }>(`/api/engagement/polls${qs}`);
      return res.polls;
    },
    enabled: Boolean(matchId),
    refetchInterval: 5_000,
  });
}

export interface EngagementMoment {
  id: string;
  matchId: string;
  title: string;
  player: string;
  minute: number;
  rarity: string;
  image: string;
  serial: string;
  match: string;
  claimed: boolean;
}

export function useEngagementMoments(matchId?: string, opts?: { requireMatch?: boolean }) {
  const requireMatch = opts?.requireMatch ?? true;
  return useQuery({
    queryKey: queryKeys.moments(matchId),
    queryFn: async () => {
      const qs = matchId ? `?matchId=${matchId}` : "";
      const res = await apiFetch<{ moments: EngagementMoment[] }>(`/api/engagement/moments${qs}`);
      return res.moments;
    },
    enabled: requireMatch ? Boolean(matchId) : true,
    refetchInterval: 10_000,
  });
}

export type FanSocials = {
  x?: string;
  discord?: string;
  farcaster?: string;
  telegram?: string;
  website?: string;
};

export type PassportPayload = {
  xp: number;
  level: number;
  streak: number;
  predictionsTotal: number;
  predictionsWon: number;
  momentsClaimed: number;
  stadiumVerified: number;
  xpStaked?: number;
  mmBalance?: number;
  pendingMm?: number;
  displayName?: string | null;
  socials?: FanSocials;
  evmAddress?: string | null;
  humanPassportScore?: number | null;
  humanPassportCheckedAt?: string | null;
  humanVerified?: boolean;
  achievements: { id: string; title: string; unlocked: boolean }[];
};

export function usePassport(enabled = true) {
  return useQuery({
    queryKey: queryKeys.passport,
    queryFn: async () => {
      const res = await apiFetch<{
        passport: PassportPayload;
        wallet: string;
      }>("/api/engagement/passport");
      return res;
    },
    enabled,
    retry: false,
  });
}

export type AlbumSticker = {
  id: string;
  title: string;
  description: string;
  rarity: string;
  imageUrl: string;
  owned: boolean;
  earnedAt?: string;
  kind: "static" | "moment";
  serial?: string;
  claimed?: boolean;
  matchId?: string;
  player?: string;
  minute?: number;
};

export type StickerAlbumResponse = {
  sets: {
    id: string;
    title: string;
    owned: number;
    total: number;
    stickers: AlbumSticker[];
  }[];
  totalOwned: number;
  recentEarns: AlbumSticker[];
};

export function useStickerAlbum(enabled = true) {
  return useQuery({
    queryKey: queryKeys.stickerAlbum,
    queryFn: () => apiFetch<StickerAlbumResponse>("/api/engagement/stickers/album"),
    enabled,
    retry: false,
  });
}

export function useRewards() {
  return useQuery({
    queryKey: queryKeys.rewards,
    queryFn: async () => {
      const res = await apiFetch<{ rewards: { id: string; title: string; xp: number; category: string }[] }>(
        "/api/engagement/rewards",
      );
      return res.rewards;
    },
  });
}

export function useStadiumStatus(matchId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.stadium(matchId),
    queryFn: async () => {
      const res = await apiFetch<{ verified: boolean; txSignature: string | null }>(
        `/api/engagement/stadium/status?matchId=${matchId}`,
      );
      return res;
    },
    enabled: Boolean(matchId) && enabled,
  });
}

export type FanMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    wallet: string;
    nickname: string | null;
    avatar: string | null;
    isAgent?: boolean;
  };
};

export type FanLeaderRow = {
  rank: number;
  wallet: string;
  nickname: string | null;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  momentsClaimed: number;
};

export type CommunitySnapshot = {
  xpLeaderboard: FanLeaderRow[];
  superfanLeaderboard: { rank: number; wallet: string; points: number; nickname: string | null; avatar: string | null }[];
  crowd: { checkedIn: number; recent: { wallet: string; nickname: string | null; verifiedAt: string }[] };
  reactions: { emoji: string; count: number }[];
  pulse: {
    id: string;
    kind: "vote" | "moment" | "stadium" | "chat";
    title: string;
    body: string;
    createdAt: string;
    wallet: string | null;
  }[];
};

export function useCommunity(matchId?: string) {
  return useQuery({
    queryKey: queryKeys.community(matchId),
    queryFn: async () => {
      const qs = matchId ? `?matchId=${encodeURIComponent(matchId)}` : "";
      return apiFetch<CommunitySnapshot>(`/api/engagement/community${qs}`);
    },
    refetchInterval: 8_000,
  });
}

export function useFanMessages(matchId?: string) {
  return useQuery({
    queryKey: queryKeys.fanMessages(matchId),
    queryFn: async () => {
      const res = await apiFetch<{ messages: FanMessage[] }>(
        `/api/engagement/community/messages?matchId=${encodeURIComponent(matchId!)}&limit=60`,
      );
      return res.messages;
    },
    enabled: Boolean(matchId),
    refetchInterval: 4_000,
  });
}

export type MatchSignal = {
  id: string;
  matchId: string;
  type: string;
  headline: string;
  prediction: string;
  confidence: number;
  impact: string | null;
  createdAt: string | null;
};

export function useMatchSignals(matchId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.signals(matchId),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "5" });
      if (matchId) qs.set("matchId", matchId);
      return apiFetch<{ signals: MatchSignal[]; ok: boolean }>(
        `/api/engagement/signals?${qs.toString()}`,
      );
    },
    enabled: Boolean(matchId) && enabled,
    staleTime: 12_000,
    refetchInterval: 15_000,
  });
}
