import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { useActiveMatchId } from "@/lib/use-active-match";
import { queryKeys } from "@/lib/queries/hooks";
import { executeAgentPilotPlan, type PilotPlan } from "@/lib/wallet/agent-pilot";
import { isSmartWalletUnlocked } from "@/lib/wallet/smart-wallet";
import { toast } from "sonner";

/**
 * While Agent Pilot is enabled and the smart wallet is unlocked:
 * plan + sign XP memos and budgeted USDC markets on-chain.
 */
export function AutoAgentRunner() {
  const connected = useAppStore((s) => s.wallet.connected);
  const matchId = useActiveMatchId();
  const qc = useQueryClient();
  const lastToast = useRef(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!connected) return;

    let cancelled = false;

    const tick = async () => {
      if (inFlight.current || cancelled) return;
      if (!isSmartWalletUnlocked()) return;

      inFlight.current = true;
      try {
        const prefsRes = await apiFetch<{ prefs: { enabled: boolean } }>("/api/engagement/auto-agent");
        if (!prefsRes.prefs.enabled || cancelled) return;

        const res = await apiFetch<PilotPlan>("/api/engagement/auto-agent", {
          method: "POST",
          body: JSON.stringify({ action: "tick", matchId: matchId ?? undefined }),
        });

        if (cancelled) return;
        const { lockedVotes, lockedMarkets, spent } = await executeAgentPilotPlan(res);

        if (lockedVotes > 0 || lockedMarkets > 0) {
          void qc.invalidateQueries({ queryKey: queryKeys.polls(matchId ?? undefined) });
          void qc.invalidateQueries({ queryKey: queryKeys.myPredictions });
          void qc.invalidateQueries({ queryKey: ["autoAgent"] });
          const now = Date.now();
          if (now - lastToast.current > 20_000) {
            lastToast.current = now;
            const bits: string[] = [];
            if (lockedVotes) bits.push(`${lockedVotes} XP vote${lockedVotes > 1 ? "s" : ""}`);
            if (lockedMarkets) {
              bits.push(`${lockedMarkets} USDC pick${lockedMarkets > 1 ? "s" : ""} (${spent} USDC)`);
            }
            toast.success(`Agent Pilot locked on-chain: ${bits.join(" · ")}`);
          }
        }
      } catch {
        /* silent */
      } finally {
        inFlight.current = false;
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 28_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [connected, matchId, qc]);

  return null;
}
