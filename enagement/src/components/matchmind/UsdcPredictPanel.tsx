import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { placePredictionOnChain } from "@/lib/wallet/prediction";
import { resolveWalletTxFns } from "@/lib/wallet/signing";
import { findWinnerMarket } from "@/lib/markets";
import { useMarkets } from "@/lib/queries/hooks";
import { queryKeys } from "@/lib/queries/hooks";
import type { Match } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const WMOS_ORIGIN = import.meta.env.VITE_WMOS_URL ?? "https://wmos.buildingcultureid.space";

const STAKES = [1, 5, 10, 25];

export function UsdcPredictPanel({ match }: { match: Match }) {
  const wallet = useAppStore((s) => s.wallet);
  const { data: markets = [] } = useMarkets(match.id);
  const market = findWinnerMarket(markets);
  const [amount, setAmount] = useState(5);
  const [outcomeId, setOutcomeId] = useState<string | null>(null);
  const qc = useQueryClient();

  const place = useMutation({
    mutationFn: async () => {
      if (!wallet.connected || !market || !outcomeId) throw new Error("Connect wallet and pick outcome");
      const outcome = market.outcomes.find((o) => o.id === outcomeId);
      if (!outcome) throw new Error("Invalid outcome");
      const txFns = await resolveWalletTxFns();
      await placePredictionOnChain({
        marketExternalId: market.id,
        optionExternalId: outcome.id,
        amount,
        walletAddress: wallet.address,
        signTransaction: txFns.signTransaction,
        sendTransaction: txFns.sendTransaction,
      });
    },
    onSuccess: () => {
      toast.success("USDC locked in escrow");
      void qc.invalidateQueries({ queryKey: queryKeys.markets(match.id) });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Prediction failed"),
  });

  if (!market) {
    const wmosUrl = `${WMOS_ORIGIN}/matches/${match.id}`;
    return (
      <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Winner market syncing for this fixture…</p>
        <p className="mt-2 text-xs text-muted-foreground">
          USDC predictions use the same WMOS escrow markets and wallet session.
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <a href={wmosUrl} target="_blank" rel="noreferrer">
            Open on WMOS
          </a>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">USDC escrow</p>
      <h3 className="mt-1 text-base font-semibold">{market.title}</h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {market.outcomes.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOutcomeId(o.id)}
            className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
              outcomeId === o.id ? "border-primary bg-primary/15 text-primary" : "border-border"
            }`}
          >
            {o.label}
            <div className="text-[10px] text-muted-foreground">{o.price.toFixed(2)}x</div>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {STAKES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setAmount(s)}
            className={`rounded-md px-3 py-1 text-xs font-mono ${amount === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {s} USDC
          </button>
        ))}
      </div>
      <Button
        className="mt-4 w-full"
        disabled={!wallet.connected || !outcomeId || place.isPending}
        onClick={() => place.mutate()}
      >
        {wallet.connected ? `Predict ${amount} USDC` : "Connect wallet to predict"}
      </Button>
    </section>
  );
}
