"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patchMatchesCache } from "@/lib/match-cache";
import type { Match } from "@/lib/types";

function traderSocketUrl(): string {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
  return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8041/ws";
}
const MATCHES_QUERY_KEY = ["matches"] as const;
const MATCHES_SAFETY_REFETCH_MS = 45_000;
const ODDS_DEBOUNCE_MS = 2_000;

type WsMessage = { channel: string; payload: Record<string, unknown> };

const CHANNEL_QUERIES: Record<string, string[][]> = {
  signals: [["signals"], ["signal"]],
  portfolio: [["performance"], ["predictions"], ["agents"]],
  agents: [["agents"]],
};

export function useTraderSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const wasConnected = useRef(false);
  const qc = useQueryClient();
  const oddsTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingOdds = useRef<Map<string, Match>>(new Map());

  const applyMatchPatch = useCallback(
    (incoming: Match, updateType: "match_update" | "odds_update") => {
      qc.setQueryData<{ matches: Match[] }>(MATCHES_QUERY_KEY, (prev) =>
        patchMatchesCache(prev, incoming, updateType),
      );
      qc.setQueryData<{ match: Match }>(["match", incoming.id], (prev) => {
        if (!prev?.match) return prev;
        const patched = patchMatchesCache({ matches: [prev.match] }, incoming, updateType);
        if (!patched?.matches[0]) return prev;
        return { match: patched.matches[0] };
      });
    },
    [qc],
  );

  const scheduleOddsPatch = useCallback(
    (match: Match) => {
      pendingOdds.current.set(match.id, match);
      const existing = oddsTimers.current.get(match.id);
      if (existing) clearTimeout(existing);
      oddsTimers.current.set(
        match.id,
        setTimeout(() => {
          const latest = pendingOdds.current.get(match.id);
          pendingOdds.current.delete(match.id);
          oddsTimers.current.delete(match.id);
          if (latest) applyMatchPatch(latest, "odds_update");
        }, ODDS_DEBOUNCE_MS),
      );
    },
    [applyMatchPatch],
  );

  const handleMatchesMessage = useCallback(
    (payload: Record<string, unknown>) => {
      const updateType = payload.type === "odds_update" ? "odds_update" : "match_update";
      const match = payload.match as Match | undefined;
      if (!match?.id) return;

      if (updateType === "odds_update") {
        scheduleOddsPatch(match);
        return;
      }
      applyMatchPatch(match, "match_update");
    },
    [applyMatchPatch, scheduleOddsPatch],
  );

  const invalidateChannel = useCallback(
    (channel: string) => {
      const keys = CHANNEL_QUERIES[channel] ?? [];
      for (const key of keys) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
    [qc],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(traderSocketUrl());
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      if (wasConnected.current) toast.success("Live feed reconnected");
      wasConnected.current = true;
    };
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        if (msg.channel === "matches") {
          handleMatchesMessage(msg.payload);
        } else {
          invalidateChannel(msg.channel);
        }
        if (msg.channel === "signals" && msg.payload.type === "new_signal") {
          const sig = msg.payload.signal as { headline?: string; confidence?: number };
          toast.success("New AI Signal", {
            description: `${sig.headline} · ${sig.confidence}% confidence`,
          });
        }
      } catch {
        /* ignore */
      }
    };
  }, [handleMatchesMessage, invalidateChannel]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      for (const timer of oddsTimers.current.values()) clearTimeout(timer);
      oddsTimers.current.clear();
      pendingOdds.current.clear();
    };
  }, [connect]);

  useEffect(() => {
    const id = setInterval(() => {
      void qc.invalidateQueries({ queryKey: MATCHES_QUERY_KEY, refetchType: "none" });
      void qc.refetchQueries({ queryKey: MATCHES_QUERY_KEY, type: "active" });
    }, MATCHES_SAFETY_REFETCH_MS);
    return () => clearInterval(id);
  }, [qc]);

  return { connected };
}
