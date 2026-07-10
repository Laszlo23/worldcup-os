import { Fragment } from "react";
import { Card } from "@/components/ui/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { KickoffCountdown } from "@/components/kickoff-countdown";
import type { Match } from "@/lib/mock/types";
import { getMatchFeedPhase } from "@/lib/match-phase";
import { hasRealStats } from "@/lib/data-truth";
import { Radio } from "lucide-react";

export function LiveMatchStats({ match }: { match: Match }) {
  const phase = getMatchFeedPhase(match);
  const live = phase === "live" || phase === "halftime";
  const awaiting = phase === "awaiting_feed";

  if (awaiting) {
    return (
      <Card className="glass p-4 border-warning/25 space-y-3">
        <KickoffCountdown kickoff={match.kickoff} mode="elapsed" variant="banner" className="w-full" />
        <div className="flex items-start gap-3">
          <Radio className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="font-display font-semibold text-sm">Kickoff passed — awaiting TxLINE live feed</p>
            <p className="text-xs text-muted-foreground">
              Predictions are locked. Scores and events will appear here automatically when TxLINE devnet publishes
              live updates (SSE or snapshot).
            </p>
            <DataSourceBadge source="txline" />
          </div>
        </div>
      </Card>
    );
  }

  if (!live || !hasRealStats(match.stats)) return null;

  const items = [
    { label: "Possession", home: `${match.stats.possession[0]}%`, away: `${match.stats.possession[1]}%` },
    { label: "Shots", home: String(match.stats.shots[0]), away: String(match.stats.shots[1]) },
    { label: "On target", home: String(match.stats.shotsOnTarget[0]), away: String(match.stats.shotsOnTarget[1]) },
    { label: "xG", home: match.stats.xg[0].toFixed(2), away: match.stats.xg[1].toFixed(2) },
    { label: "Corners", home: String(match.stats.corners[0]), away: String(match.stats.corners[1]) },
  ];

  return (
    <Card className="glass p-4 border-destructive/20">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Live stats</p>
        <DataSourceBadge source="txline" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 text-sm font-mono">
        <div className="text-right font-semibold truncate">{match.home.code}</div>
        <div />
        <div className="font-semibold truncate">{match.away.code}</div>
        {items.map((item) => (
          <Fragment key={item.label}>
            <div className="text-right tabular-nums">{item.home}</div>
            <div className="text-center text-[10px] uppercase text-muted-foreground">{item.label}</div>
            <div className="tabular-nums">{item.away}</div>
          </Fragment>
        ))}
      </div>
    </Card>
  );
}
