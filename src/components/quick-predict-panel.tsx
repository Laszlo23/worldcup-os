import { useState } from "react";
import { Loader2, ShieldCheck, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { DevnetUsdcFaucet, getDefaultStakeAmount, getDevnetStakePresets } from "@/components/devnet-usdc-faucet";
import { useAppStore } from "@/lib/store";
import { queryKeys } from "@/lib/queries/hooks";
import { isMarketBettable } from "@/lib/markets";
import type { Market, MarketOutcome, Match } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

const STAKE_PRESETS = getDevnetStakePresets();

type QuickPredictPanelProps = {
  match: Match;
  market: Market;
  variant?: "hero" | "compact";
  className?: string;
};

export function QuickPredictPanel({ match, market, variant = "hero", className }: QuickPredictPanelProps) {
  const [selected, setSelected] = useState<MarketOutcome | null>(null);
  const [amount, setAmount] = useState<number>(getDefaultStakeAmount());
  const [placing, setPlacing] = useState(false);
  const place = useAppStore((s) => s.placePrediction);
  const wallet = useAppStore((s) => s.wallet);
  const qc = useQueryClient();
  const canPredict = isMarketBettable(match, market);

  const home = market.outcomes.find((o) => o.id === "h");
  const draw = market.outcomes.find((o) => o.id === "d");
  const away = market.outcomes.find((o) => o.id === "a");
  const picks = [
    { outcome: home, side: match.home, code: match.home.code },
    { outcome: draw, side: null, code: "Draw" },
    { outcome: away, side: match.away, code: match.away.code },
  ].filter((p): p is typeof picks[number] & { outcome: MarketOutcome } => Boolean(p.outcome));

  const handlePredict = async () => {
    if (!selected || !canPredict) return;
    setPlacing(true);
    try {
      const txSignature = await place({
        marketId: market.id,
        matchId: match.id,
        outcomeId: selected.id,
        outcomeLabel: `${market.title}: ${selected.label}`,
        amount,
        price: selected.price,
      });
      if (txSignature) {
        setSelected(null);
        void qc.invalidateQueries({ queryKey: queryKeys.portfolio });
        void qc.invalidateQueries({ queryKey: queryKeys.analytics });
        void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
        void qc.invalidateQueries({ queryKey: queryKeys.match(match.id) });
        void qc.invalidateQueries({ queryKey: queryKeys.markets() });
      }
    } finally {
      setPlacing(false);
    }
  };

  if (!canPredict) {
    return (
      <Card className={cn("glass p-4 text-sm text-muted-foreground", className)}>
        Predictions are closed for this fixture.
      </Card>
    );
  }

  const payout = selected ? (amount * selected.price).toFixed(2) : "—";

  return (
    <Card className={cn("glass border-primary/25", variant === "hero" ? "p-5 sm:p-6" : "p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-1">Match winner</p>
          <h3 className="font-display font-semibold text-lg">Pick your outcome</h3>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          Closes 5 min before kickoff
        </Badge>
      </div>

      <div className={cn("grid gap-2", variant === "hero" ? "sm:grid-cols-3" : "grid-cols-3")}>
        {picks.map(({ outcome, side, code }) => {
          const active = selected?.id === outcome.id;
          return (
            <button
              key={outcome.id}
              type="button"
              onClick={() => setSelected(outcome)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-primary bg-primary/15 glow-primary"
                  : "border-border/70 bg-black/20 hover:border-primary/40",
              )}
            >
              <div className="text-xl mb-1">{side?.flag ?? "🤝"}</div>
              <div className="font-medium text-sm truncate">{side?.name ?? code}</div>
              <div className="font-display text-xl font-bold text-primary tabular-nums mt-1">{outcome.price.toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {Math.round((1 / outcome.price) * 100)}% implied
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STAKE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-mono border transition-colors",
              amount === preset
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/40",
            )}
          >
            {preset} USDC
          </button>
        ))}
      </div>

      <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="text-sm space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Stake</span>
            <span className="font-mono text-foreground">{amount} USDC</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Potential payout</span>
            <span className="font-mono font-semibold text-primary">{payout} USDC</span>
          </div>
        </div>

        {!wallet.connected ? (
          <ConnectWalletButton size="sm" className="w-full sm:w-auto" />
        ) : (
          <Button
            className="w-full sm:w-auto bg-gradient-primary text-primary-foreground border-0 min-w-[9rem]"
            disabled={!selected || placing || amount > wallet.balance || amount <= 0}
            onClick={() => void handlePredict()}
          >
            {placing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sign in wallet…
              </>
            ) : (
              <>Predict · {amount} USDC</>
            )}
          </Button>
        )}
      </div>

      {!wallet.connected && (
        <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" /> Connect Phantom to sign the escrow transfer from your wallet.
        </p>
      )}

      {wallet.connected && amount > wallet.balance && (
        <div className="mt-3 text-[11px] text-warning flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Insufficient USDC balance ({wallet.balance.toFixed(2)} available).</span>
          <DevnetUsdcFaucet variant="inline" />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/60 flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <p>
          Your USDC moves from your wallet into a Solana program escrow PDA. You sign every transfer. We verify the
          on-chain tx before recording your prediction.
        </p>
      </div>
    </Card>
  );
}
