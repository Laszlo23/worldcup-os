import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { useActiveMatchId } from "@/lib/use-active-match";
import { queryKeys } from "@/lib/queries/hooks";
import { votePollOnChain } from "@/lib/wallet/poll-vote";
import { isSmartWalletUnlocked } from "@/lib/wallet/smart-wallet";
import { toast } from "sonner";

/**
 * While Agent Pilot is enabled and the smart wallet is unlocked,
 * plan votes server-side then lock each one on-chain via the internal wallet.
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

        const res = await apiFetch<{
          planned?: { pollId: string; choice: "yes" | "no" }[];
          voted?: { pollId: string; choice: string }[];
        }>("/api/engagement/auto-agent", {
          method: "POST",
          body: JSON.stringify({ action: "tick", matchId: matchId ?? undefined }),
        });

        const planned = res.planned ?? [];
        if (!planned.length || cancelled) return;

        let locked = 0;
        for (const plan of planned) {
          if (cancelled) break;
          try {
            await votePollOnChain({ pollId: plan.pollId, choice: plan.choice });
            locked += 1;
          } catch {
            /* skip failed vote — poll may have closed */
          }
        }

        if (locked > 0) {
          void qc.invalidateQueries({ queryKey: queryKeys.polls(matchId ?? undefined) });
          void qc.invalidateQueries({ queryKey: ["autoAgent"] });
          const now = Date.now();
          if (now - lastToast.current > 20_000) {
            lastToast.current = now;
            toast.success(`Agent Pilot locked ${locked} on-chain vote${locked > 1 ? "s" : ""}`);
          }
        }
      } catch {
        /* silent — offline / rate limit */
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
