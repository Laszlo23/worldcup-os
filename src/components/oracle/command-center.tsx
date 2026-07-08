import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineViz } from "./pipeline-viz";
import { EventTimeline } from "./event-timeline";
import { useOracleFeed } from "@/lib/queries/hooks";
import { Radio, Database, Cpu } from "lucide-react";

export function OracleCommandCenter() {
  const { events, health, latencyMs, connected } = useOracleFeed();

  const pipelineIndex = useMemo(() => {
    const latest = events[0]?.event_type;
    if (latest === "proof_verified") return 5;
    if (latest === "settlement") return 4;
    if (latest === "market_close" || latest === "odds_update") return 2;
    if (latest === "goal") return 1;
    return 2;
  }, [events]);

  const fixtureStats = health?.fixtures;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Oracle Command Center</h1>
            <p className="text-sm text-muted-foreground">TxLINE live stream · verified sports intelligence pipeline</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={connected ? "bg-primary/20 text-primary border-primary/30 gap-1.5" : "bg-warning/20 text-warning border-warning/30 gap-1.5"}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary animate-live-dot" : "bg-warning"}`} />
            TXLINE {connected ? "CONNECTED" : "DEGRADED"}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">SL{health?.txline?.serviceLevel ?? 12}</Badge>
          <Badge variant="outline" className="font-mono text-xs">{latencyMs}ms</Badge>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-4 min-h-[calc(100vh-12rem)]">
        <Card className="glass p-4 lg:col-span-3">
          <PipelineViz activeIndex={pipelineIndex} />
        </Card>

        <Card className="glass p-4 lg:col-span-6 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">TXLINE LIVE STREAM</span>
            <span className="text-[10px] text-muted-foreground">{events.length} events</span>
          </div>
          <EventTimeline events={events} />
        </Card>

        <Card className="glass p-4 lg:col-span-3 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Fixture index</div>
          <div className="space-y-3">
            <StatRow icon={Database} label="Total fixtures" value={String(fixtureStats?.total ?? 104)} />
            <StatRow icon={Radio} label="Live now" value={String(fixtureStats?.live ?? 2)} accent />
            <StatRow icon={Cpu} label="Last sync" value={fixtureStats?.lastSyncAt ? new Date(fixtureStats.lastSyncAt).toLocaleTimeString() : "mock mode"} />
          </div>
          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Worker</div>
            <p className="text-xs text-muted-foreground">
              SSE worker polls TxLINE every 5s. Settlement jobs enqueue on final whistle.
            </p>
            <Badge variant="outline" className="text-xs">
              DB: {health?.database ? "connected" : "fallback"}
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-4 w-4 ${accent ? "text-destructive" : ""}`} />
        {label}
      </div>
      <span className={`font-mono text-sm font-semibold ${accent ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
