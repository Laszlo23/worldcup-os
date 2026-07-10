"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8041/ws";

type WsMessage = { channel: string; payload: Record<string, unknown> };

const CHANNEL_QUERIES: Record<string, string[][]> = {
  matches: [["matches"]],
  signals: [["signals"], ["signal"]],
  portfolio: [["performance"], ["predictions"], ["agents"]],
  agents: [["agents"]],
};

export function useTraderSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const wasConnected = useRef(false);
  const qc = useQueryClient();

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
    const ws = new WebSocket(WS_URL);
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
        invalidateChannel(msg.channel);
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
  }, [invalidateChannel]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { connected };
}
