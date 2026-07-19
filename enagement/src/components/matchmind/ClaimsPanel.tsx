import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { queryKeys } from "@/lib/queries/hooks";

type Pred = {
  id: string;
  matchId: string;
  outcomeLabel: string;
  amount: number;
  status: string;
  payout?: number;
  claimed: boolean;
};

/** Claim won USDC predictions back into the MatchMind wallet. */
export function ClaimsPanel() {
  const wallet = useAppStore((s) => s.wallet);
  const updateWalletBalance = useAppStore((s) => s.updateWalletBalance);
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["myPredictions"],
    queryFn: () => apiFetch<{ predictions: Pred[] }>("/api/predictions/mine"),
    enabled: wallet.connected,
    refetchInterval: 15_000,
  });

  const claimable = (data?.predictions ?? []).filter((p) => p.status === "won" && !p.claimed);

  const claim = useMutation({
    mutationFn: (predictionExternalId: string) =>
      apiFetch<{ ok: boolean; payout: number; explorerUrl?: string | null }>("/api/predictions/claim", {
        method: "POST",
        body: JSON.stringify({ predictionExternalId }),
      }),
    onSuccess: (res) => {
      toast.success(`Claimed ${res.payout.toFixed(2)} USDC`, {
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl!, "_blank") }
          : undefined,
      });
      updateWalletBalance(wallet.balance + res.payout);
      void qc.invalidateQueries({ queryKey: ["myPredictions"] });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Claim failed");
    },
  });

  if (!wallet.connected) return null;

  return (
    <section className="rounded-3xl border border-gold/30 bg-gold/8 p-4">
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
        <Trophy className="size-3.5" />
        Prediction claims
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Won USDC markets pay out here into your MatchMind wallet.
      </p>
      {isPending ? (
        <p className="mt-3 text-xs text-muted-foreground">Checking…</p>
      ) : claimable.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No claimable wins yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {claimable.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.outcomeLabel}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Stake {p.amount} · payout {(p.payout ?? 0).toFixed(2)} USDC
                </p>
              </div>
              <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate(p.id)}>
                {claim.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Claim"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
