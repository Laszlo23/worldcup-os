import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { placePredictionOnChain } from "@/lib/wallet/prediction";
import { resolveWalletTxFns } from "@/lib/wallet/signing";
import { findWinnerMarket, isMatchBettable } from "@/lib/markets";
import { useMarkets, queryKeys } from "@/lib/queries/hooks";
import type { Match } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { toast } from "sonner";
import { parseWalletSimulationError } from "@/lib/wallet/prediction-errors";

const WMOS_ORIGIN = import.meta.env.VITE_WMOS_URL ?? "https://wmos.buildingcultureid.space";

const STAKES = [1, 5, 10, 25];

export function UsdcPredictPanel({ match }: { match: Match }) {
  const wallet = useAppStore((s) => s.wallet);
  const bettable = isMatchBettable(match);
  const { data: markets = [], isPending } = useMarkets(match.id);
  const market = findWinnerMarket(markets);
  const [amount, setAmount] = useState(5);
  const [outcomeId, setOutcomeId] = useState<string | null>(null);
  const qc = useQueryClient();
  const wmosUrl = `${WMOS_ORIGIN}/matches/${match.id}`;

  const place = useMutation({
    mutationFn: async () => {
      if (!wallet.connected || !market || !outcomeId) throw new Error("Connect wallet and pick an outcome");
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
      toast.success("USDC locked in escrow", {
        description: "Settle and claim from WMOS after the match finishes.",
        action: { label: "WMOS", onClick: () => window.open(wmosUrl, "_blank") },
      });
      void qc.invalidateQueries({ queryKey: queryKeys.markets(match.id) });
    },
    onError: (err) => {
      const raw = err instanceof Error ? err.message : "Prediction failed";
      toast.error(parseWalletSimulationError(raw) ?? raw);
    },
  });

  if (!bettable) {
    return (
      <section className="glass-strong rounded-2xl p-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">USDC markets</p>
        <h3 className="mt-1 font-display text-base font-semibold">Pre-match only</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          USDC escrow opens while the fixture is still scheduled (closes 5 minutes before kickoff). This match is{" "}
          <span className="font-mono uppercase text-foreground">{match.status}</span> — use free XP polls during the game.
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <a href={wmosUrl} target="_blank" rel="noreferrer">
            Open markets on WMOS
          </a>
        </Button>
      </section>
    );
  }

  if (isPending) {
    return (
      <section className="glass rounded-2xl p-4">
        <p className="text-sm text-muted-foreground">Loading winner market…</p>
      </section>
    );
  }

  if (!market) {
    return (
      <section className="glass-strong rounded-2xl p-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">USDC escrow</p>
        <h3 className="mt-1 font-display text-base font-semibold">Market syncing</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Winner market is not ready for this fixture yet. Try WMOS or check back shortly.
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
    <section className="glass-strong rounded-2xl p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">USDC escrow</p>
      <h3 className="mt-1 font-display text-base font-semibold">{market.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Pick an outcome, stake USDC on Solana. Funds lock until settlement.
      </p>
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
            className={`rounded-md px-3 py-1 font-mono text-xs ${
              amount === s ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {s} USDC
          </button>
        ))}
      </div>
      {wallet.connected ? (
        <Button
          className="mt-4 w-full"
          disabled={!outcomeId || place.isPending}
          onClick={() => place.mutate()}
        >
          {place.isPending ? "Confirm in wallet…" : `Lock ${amount} USDC`}
        </Button>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">Connect wallet to stake USDC</p>
          <ConnectWalletButton size="default" />
        </div>
      )}
    </section>
  );
}
