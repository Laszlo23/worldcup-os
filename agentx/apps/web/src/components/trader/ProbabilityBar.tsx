import { cn } from "@/lib/utils";

export function ProbabilityBar({ home, draw, away, homeLabel, awayLabel }: { home: number; draw: number; away: number; homeLabel?: string; awayLabel?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full">
        <div className="bg-gold transition-all" style={{ width: `${home}%` }} />
        <div className="bg-muted-foreground/40 transition-all" style={{ width: `${draw}%` }} />
        <div className="bg-purple transition-all" style={{ width: `${away}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gold">{homeLabel || "Home"} {home}%</span>
        <span className="text-muted-foreground">Draw {draw}%</span>
        <span className="text-purple">{awayLabel || "Away"} {away}%</span>
      </div>
    </div>
  );
}

export function SignalBadge({ type, impact }: { type: string; impact: string }) {
  return (
    <div className="flex gap-2">
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold uppercase", type === "bullish" ? "bg-green/15 text-green" : "bg-destructive/15 text-red-400")}>
        {type}
      </span>
      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold uppercase text-gold">{impact} impact</span>
    </div>
  );
}
