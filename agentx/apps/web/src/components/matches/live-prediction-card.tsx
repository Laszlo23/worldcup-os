"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeLivePredictionOnChain } from "@/lib/wallet/prediction";
import { useWalletSigning } from "@/lib/wallet/use-wallet-signing";
import { useWalletStore } from "@/lib/store/wallet";
import type { LiveMarket } from "@/lib/types";
import { Button } from "@/components/ui/button";

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LivePredictionCard({ market }: { market: LiveMarket }) {
  const [countdown, setCountdown] = useState(market.countdown ?? 420);
  const [amount, setAmount] = useState("10");
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const { ensureReady, sessionConnected } = useWalletSigning();
  const wallet = useWalletStore((s) => s.wallet);
  const qc = useQueryClient();

  useEffect(() => {
    setCountdown(market.countdown ?? 420);
  }, [market.countdown]);

  useEffect(() => {
    if (countdown <= 0 || choice) return;
    const id = setInterval(() => setCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown, choice]);

  const place = useMutation({
    mutationFn: async (side: "yes" | "no") => {
      const stake = Number(amount);
      if (!Number.isFinite(stake) || stake <= 0) throw new Error("Enter a valid USDC amount");
      const option = market.options.find((o) => o.externalId === side);
      if (!option) throw new Error("Outcome not found");
      const fns = await ensureReady();
      return placeLivePredictionOnChain({
        marketExternalId: market.externalId,
        optionExternalId: option.externalId,
        amount: stake,
        walletTx: fns,
      });
    },
    onSuccess: (_res, side) => {
      setChoice(side);
      toast.success("Live prediction locked", {
        description: `${amount} USDC on ${side === "yes" ? "Yes" : "No"}`,
      });
      void qc.invalidateQueries({ queryKey: ["match-markets", market.id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Prediction failed"),
  });

  const ringPct = countdown > 0 ? Math.min(100, (countdown / 420) * 100) : 0;
  const disabled = countdown <= 0 || Boolean(choice) || place.isPending;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
            Live · 7 min window
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug">{market.title}</h3>
          {!sessionConnected ? (
            <p className="mt-2 text-xs text-muted-foreground">Connect wallet to predict with USDC</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Balance: {wallet.balance.toFixed(0)} USDC · pays {market.options[0]?.price.toFixed(2)}x
            </p>
          )}
        </div>
        <div className="relative grid size-12 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="size-12 -rotate-90">
            <circle cx="18" cy="18" r="16" className="fill-none stroke-muted" strokeWidth="2" />
            <circle
              cx="18"
              cy="18"
              r="16"
              className="fill-none stroke-gold transition-[stroke-dashoffset] duration-1000 ease-linear"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 * (1 - ringPct / 100)}
            />
          </svg>
          <span className="absolute font-mono text-[10px] font-bold tabular-nums text-gold">
            {formatCountdown(countdown)}
          </span>
        </div>
      </div>

      {sessionConnected && !choice ? (
        <div className="mt-4">
          <label className="text-xs text-muted-foreground">Stake (USDC)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["yes", "no"] as const).map((side) => {
          const opt = market.options.find((o) => o.externalId === side);
          const selected = choice === side;
          return (
            <Button
              key={side}
              variant={selected ? "default" : "outline"}
              className="min-h-11 capitalize"
              disabled={disabled || !sessionConnected}
              onClick={() => place.mutate(side)}
            >
              {place.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="mr-1 h-3.5 w-3.5" />
                  {side} · {opt?.price.toFixed(2)}x
                </>
              )}
            </Button>
          );
        })}
      </div>
      {choice ? (
        <p className="mt-3 text-center text-xs text-green">Locked — {choice.toUpperCase()} · {amount} USDC</p>
      ) : null}
    </article>
  );
}
