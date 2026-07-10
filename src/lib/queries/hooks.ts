import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { useAppStore } from "../store";
import { ApiError } from "../api/client";
import type { Match, Market, Prediction, TxLineProof, EscrowProof, LeaderRow } from "../mock/types";
import type { AnalyticsSnapshot, PortfolioSummary, AdminDashboard } from "../types";
import type { ProfileResponse } from "../types/profile";
import type { ChatMessage } from "../feed-items";

export const queryKeys = {
  matches: ["matches"] as const,
  match: (id: string) => ["match", id] as const,
  markets: (matchId?: string) => ["markets", matchId ?? "all"] as const,
  proofs: ["proofs"] as const,
  leaderboard: (period: string) => ["leaderboard", period] as const,
  analytics: ["analytics"] as const,
  dashboard: ["dashboard"] as const,
  health: ["health"] as const,
  portfolio: ["portfolio"] as const,
  liveEvents: (matchId?: string) => ["liveEvents", matchId ?? "all"] as const,
  chatMessages: ["chatMessages"] as const,
  admin: ["admin"] as const,
};

export function useMatches() {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: async () => {
      const res = await apiFetch<{ matches: Match[] }>("/api/matches");
      return res.matches;
    },
    staleTime: 10_000,
  });
}

export function useMatchDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.match(id),
    queryFn: async () => {
      const res = await apiFetch<{
        match: Match;
        markets: Market[];
        proof?: TxLineProof | null;
        escrowProofs?: EscrowProof[];
      }>(`/api/matches/${id}`);
      return res;
    },
    enabled: Boolean(id),
    staleTime: 3_000,
    refetchInterval: (query) => {
      const status = query.state.data?.match.status;
      if (status === "live" || status === "halftime") return 3_000;
      if (status === "scheduled") return 10_000;
      return false;
    },
  });
}

export function useMarkets(matchId?: string, bettableOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.markets(matchId), bettableOnly ? "bettable" : "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (matchId) params.set("matchId", matchId);
      if (bettableOnly) params.set("bettable", "true");
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch<{ markets: Market[] }>(`/api/markets${qs}`);
      return res.markets;
    },
    staleTime: 8_000,
    refetchInterval: bettableOnly ? 12_000 : 15_000,
  });
}

export function useProofs() {
  return useQuery({
    queryKey: queryKeys.proofs,
    queryFn: async () => {
      const res = await apiFetch<{ proofs: TxLineProof[]; escrowProofs: EscrowProof[] }>("/api/proofs");
      return res;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useLeaderboard(period: "weekly" | "monthly" | "all_time" = "all_time") {
  return useQuery({
    queryKey: queryKeys.leaderboard(period),
    queryFn: async () => {
      const res = await apiFetch<{ rows: LeaderRow[] }>(`/api/leaderboard?period=${period}`);
      return res.rows;
    },
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: async () => {
      const res = await apiFetch<{ analytics: AnalyticsSnapshot }>("/api/analytics");
      return res.analytics;
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const res = await apiFetch<{ totals: AnalyticsSnapshot["totals"]; matches: Match[] }>("/api/dashboard");
      return res;
    },
    staleTime: 10_000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      return apiFetch<{
        status: string;
        database: boolean;
        fixtures: {
          total: number;
          live: number;
          lastSyncAt: string | null;
        };
        txline: {
          status: string;
          serviceLevel: number;
          lastSseAt: string | null;
          lastPingAt: string | null;
        };
      }>("/api/health");
    },
    refetchInterval: 30_000,
  });
}

export function usePortfolio() {
  const wallet = useAppStore((s) => s.wallet);
  return useQuery({
    queryKey: [...queryKeys.portfolio, wallet.address] as const,
    queryFn: async () => {
      const res = await apiFetch<{ portfolio: PortfolioSummary }>("/api/portfolio");
      return res.portfolio;
    },
    enabled: wallet.connected && Boolean(wallet.address),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export interface LiveEvent {
  id: string;
  event_type: string;
  title: string;
  body: string;
  created_at: string;
  match_id?: string | null;
  payload?: Record<string, unknown> | null;
}

export function useLiveEvents(matchId?: string, refetchIntervalMs = 5_000, scope: "feed" | "pipeline" = "feed") {
  return useQuery({
    queryKey: [...queryKeys.liveEvents(matchId), scope] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (matchId) params.set("matchId", matchId);
      if (scope === "pipeline") params.set("scope", "pipeline");
      if (scope === "pipeline") params.set("limit", "200");
      const qs = params.toString();
      const res = await apiFetch<{ events: LiveEvent[] }>(
        `/api/stream/events${qs ? `?${qs}` : ""}`,
      );
      return res.events;
    },
    refetchInterval: refetchIntervalMs,
  });
}

export function useChatMessages(refetchIntervalMs = 5_000) {
  return useQuery({
    queryKey: queryKeys.chatMessages,
    queryFn: async () => {
      const res = await apiFetch<{ messages: ChatMessage[] }>("/api/chat/messages?limit=50");
      return res.messages;
    },
    refetchInterval: refetchIntervalMs,
  });
}

export function usePostChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      return apiFetch<{ message: ChatMessage }>("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({ body }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.chatMessages });
    },
  });
}

export function useOracleFeed(refetchIntervalMs = 5_000, opts?: { eventScope?: "feed" | "pipeline" }) {
  const eventScope = opts?.eventScope ?? "feed";
  const healthQuery = useHealth();
  const eventsQuery = useLiveEvents(undefined, refetchIntervalMs, eventScope);
  const chatQuery = useChatMessages(refetchIntervalMs);
  const fetchedAt = eventsQuery.dataUpdatedAt || chatQuery.dataUpdatedAt || healthQuery.dataUpdatedAt;
  const latencyMs = fetchedAt ? Math.max(0, Date.now() - fetchedAt) : 0;
  const connected = healthQuery.data?.txline?.status === "healthy";
  const events = eventsQuery.data ?? [];
  const chatMessages = chatQuery.data ?? [];

  return {
    events,
    chatMessages,
    health: healthQuery.data,
    latencyMs: Math.min(latencyMs, 9999),
    connected,
    isLoading: eventsQuery.isLoading || chatQuery.isLoading || healthQuery.isLoading,
  };
}

export function useAdminDashboard() {
  const wallet = useAppStore((s) => s.wallet);
  return useQuery({
    queryKey: queryKeys.admin,
    queryFn: async () => apiFetch<AdminDashboard>("/api/admin"),
    enabled: wallet.connected,
  });
}

export function usePlacePrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      marketExternalId: string;
      optionExternalId: string;
      amount: number;
      txSignature?: string;
      escrowPda?: string;
    }) => {
      return apiFetch<{ prediction: Prediction }>("/api/predictions/place", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.portfolio });
      void qc.invalidateQueries({ queryKey: queryKeys.analytics });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useClaimPrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (predictionExternalId: string) => {
      return apiFetch<{ ok: boolean; payout: number }>("/api/predictions/claim", {
        method: "POST",
        body: JSON.stringify({ predictionExternalId }),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.portfolio });
      void qc.invalidateQueries({ queryKey: queryKeys.analytics });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useProfile() {
  const wallet = useAppStore((s) => s.wallet);
  return useQuery({
    queryKey: ["profile"] as const,
    queryFn: async () => {
      return apiFetch<ProfileResponse>("/api/profile");
    },
    enabled: wallet.connected,
  });
}
