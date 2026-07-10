import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { useMarkets } from "@/lib/queries/hooks";
import { QuickPredictPanel } from "@/components/quick-predict-panel";
import { findWinnerMarket, isMatchBettable } from "@/lib/markets";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/_app/markets")({
  head: () => ({ meta: [{ title: pageTitle("Predictions") }] }),
  component: Markets,
});

function Markets() {
  const matches = useAppStore((s) => s.matches);
  const { data: marketList = [], isLoading } = useMarkets(undefined, true);

  const bettableByMatch = new Map<string, ReturnType<typeof findWinnerMarket>>();
  for (const mk of marketList) {
    if (mk.type !== "winner") continue;
    bettableByMatch.set(mk.matchId, mk);
  }

  const cards = matches
    .filter((m) => isMatchBettable(m) && bettableByMatch.has(m.id))
    .map((match) => ({
      match,
      market: bettableByMatch.get(match.id)!,
    }));

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-2">Open predictions</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Predict on upcoming matches</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
          Only fixtures you can still bet on are shown. Pick home, draw, or away — your USDC locks in Solana escrow until TxLINE settles the result.
        </p>
      </div>

      {isLoading && (
        <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">Loading open markets…</div>
      )}

      {!isLoading && cards.length === 0 && (
        <div className="glass rounded-xl p-10 text-center text-sm text-muted-foreground">
          No open prediction markets right now. Check back when new fixtures are scheduled.
        </div>
      )}

      <div className="space-y-5">
        {cards.map(({ match, market }) => (
          <section key={match.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{match.home.flag}</span>
                <div className="min-w-0">
                  <h2 className="font-display font-semibold truncate">
                    {match.home.name} vs {match.away.name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {match.stage} · {new Date(match.kickoff).toLocaleString()}
                  </p>
                </div>
                <span className="text-2xl">{match.away.flag}</span>
              </div>
              <Button asChild variant="outline" size="sm" className="glass font-mono text-[10px] uppercase">
                <Link to="/matches/$id" params={{ id: match.id }} className="inline-flex items-center">
                  Match detail <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
            <QuickPredictPanel match={match} market={market} variant="compact" />
          </section>
        ))}
      </div>
    </div>
  );
}
