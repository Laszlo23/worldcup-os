import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { useMarkets } from "@/lib/queries/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity } from "lucide-react";

export const Route = createFileRoute("/_app/markets")({
  head: () => ({ meta: [{ title: "Prediction Markets — World Cup OS" }] }),
  component: Markets,
});

function Markets() {
  const matches = useAppStore((s) => s.matches).filter((m) => m.status !== "settled");
  const { data: marketList = [] } = useMarkets();
  const all = marketList
    .map((mk) => ({ ...mk, match: matches.find((m) => m.id === mk.matchId)! }))
    .filter((mk) => Boolean(mk.match));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Prediction markets</h1>
        <p className="text-muted-foreground mt-1">Every match, every outcome. Non-custodial, oracle-settled.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {all.map((mk) => (
          <Card key={mk.id} className="glass p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-xs">{mk.match.home.code} vs {mk.match.away.code}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> ${(mk.totalLiquidity / 1000).toFixed(1)}k</span>
            </div>
            <h3 className="font-display font-semibold mb-3">{mk.title}</h3>
            <div className="space-y-2 flex-1">
              {mk.outcomes.slice(0, 3).map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm glass rounded-lg px-3 py-2">
                  <span className="truncate flex-1">{o.label}</span>
                  <span className="font-mono font-semibold text-primary">{o.price.toFixed(2)}</span>
                </div>
              ))}
              {mk.outcomes.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">+{mk.outcomes.length - 3} more outcomes</div>
              )}
            </div>
            <Link to="/matches/$id" params={{ id: mk.match.id }} className="mt-4">
              <Button variant="outline" className="w-full glass">
                Trade market <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
