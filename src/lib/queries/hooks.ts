import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { useAppStore } from "../store";
import type { Match, Market, Prediction, TxLineProof, LeaderRow } from "../mock/types";
import type { AnalyticsSnapshot, PortfolioSummary, AdminDashboard } from "../types";

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
      const res = await apiFetch<{ match: Match; markets: Market[] }>(`/api/matches/${id}`);
      return res;
    },
    enabled: Boolean(id),
    staleTime: 5_000,
  });
}

export function useMarkets(matchId?: string) {
  return useQuery({
    queryKey: queryKeys.markets(matchId),
    queryFn: async () => {
      const qs = matchId ? `?matchId=${encodeURIComponent(matchId)}` : "";
      const res = await apiFetch<{ markets: Market[] }>(`/api/markets${qs}`);
      return res.markets;
    },
    staleTime: 10_000,
  });
}

export function useProofs() {
  return useQuery({
    queryKey: queryKeys.proofs,
    queryFn: async () => {
      const res = await apiFetch<{ proofs: TxLineProof[] }>("/api/proofs");
      return res.proofs;
    },
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
    queryKey: queryKeys.portfolio,
    queryFn: async () => {
      const res = await apiFetch<{ portfolio: PortfolioSummary }>("/api/portfolio");
      return res.portfolio;
    },
    enabled: wallet.connected,
  });
}

export function useLiveEvents(matchId?: string) {
  return useQuery({
    queryKey: queryKeys.liveEvents(matchId),
    queryFn: async () => {
      const qs = matchId ? `?matchId=${encodeURIComponent(matchId)}` : "";
      const res = await apiFetch<{ events: { id: string; event_type: string; title: string; body: string; created_at: string }[] }>(
        `/api/stream/events${qs}`,
      );
      return res.events;
    },
    refetchInterval: 5_000,
  });
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
    },
  });
}
