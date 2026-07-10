import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineViz } from "./pipeline-viz";
import { EventTimeline } from "./event-timeline";
import { useOracleFeed } from "@/lib/queries/hooks";
import { normalizeLiveEvents } from "@/lib/live-events";
import { computePipelineIndex } from "@/lib/pipeline-stage";
import { Radio, Database, Cpu } from "lucide-react";

export function OracleCommandCenter() {
  const { events, health, latencyMs, connected } = useOracleFeed(5_000, { eventScope: "pipeline" });
  const [mobileTab, setMobileTab] = useState("stream");

  const pipelineIndex = useMemo(
    () =>
      computePipelineIndex(events, {
        txlineConnected: connected,
        fixtureCount: health?.fixtures?.total,
      }),
    [events, connected, health?.fixtures?.total],
  );

  const timelineEvents = useMemo(() => [...normalizeLiveEvents(events)].reverse(), [events]);

  const fixtureStats = health?.fixtures;

  const statsPanel = (
    <div className="space-y-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Fixture index</div>
      <div className="space-y-3">
        <StatRow icon={Database} label="Total fixtures" value={String(fixtureStats?.total ?? 0)} />
        <StatRow icon={Radio} label="Live now" value={String(fixtureStats?.live ?? 0)} accent />
        <StatRow icon={Cpu} label="Last sync" value={fixtureStats?.lastSyncAt ? new Date(fixtureStats.lastSyncAt).toLocaleTimeString() : "awaiting sync"} />
      </div>
      <div className="pt-3 border-t border-border space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Worker</div>
        <p className="text-xs text-muted-foreground">
          Pipeline advances when fixtures sync, markets lock, escrows fund, and settlement completes.
        </p>
        <Badge variant="outline" className="text-xs">
          DB: {health?.database ? "connected" : "required"}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center glow-primary shrink-0">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold tracking-tight">Oracle Command Center</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">TxLINE live stream · verified sports intelligence</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Badge className={connected ? "bg-primary/20 text-primary border-primary/30 gap-1.5" : "bg-warning/20 text-warning border-warning/30 gap-1.5"}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary animate-live-dot" : "bg-warning"}`} />
            TXLINE {connected ? "CONNECTED" : "DEGRADED"}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">SL{health?.txline?.serviceLevel ?? 12}</Badge>
          <Badge variant="outline" className="font-mono text-xs">{latencyMs}ms</Badge>
        </div>
      </header>

      {/* Mobile: tabbed panels */}
      <div className="lg:hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="pipeline" className="text-xs sm:text-sm">Pipeline</TabsTrigger>
            <TabsTrigger value="stream" className="text-xs sm:text-sm">Stream</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm">Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="pipeline" className="mt-3">
            <Card className="terminal-panel neon-edge-sm p-4 border-0">
              <PipelineViz activeIndex={pipelineIndex} />
            </Card>
          </TabsContent>
          <TabsContent value="stream" className="mt-3">
            <Card className="terminal-panel neon-edge-sm p-4 flex flex-col min-h-[50vh] border-0">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">TXLINE LIVE STREAM</span>
                <span className="text-[10px] text-muted-foreground">{timelineEvents.length} events</span>
              </div>
              <EventTimeline events={timelineEvents} />
            </Card>
          </TabsContent>
          <TabsContent value="stats" className="mt-3">
            <Card className="terminal-panel neon-edge-sm p-4 border-0">{statsPanel}</Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: three-column layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 min-h-[calc(100vh-12rem)]">
        <Card className="terminal-panel neon-edge-sm p-4 lg:col-span-3 border-0">
          <PipelineViz activeIndex={pipelineIndex} />
        </Card>

        <Card className="terminal-panel neon-edge-sm p-4 lg:col-span-6 flex flex-col border-0">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">TXLINE LIVE STREAM</span>
            <span className="text-[10px] text-muted-foreground">{timelineEvents.length} events</span>
          </div>
          <EventTimeline events={timelineEvents} />
        </Card>

        <Card className="terminal-panel neon-edge-sm p-4 lg:col-span-3 border-0">{statsPanel}</Card>
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        <Icon className={`h-4 w-4 shrink-0 ${accent ? "text-destructive" : ""}`} />
        <span className="truncate">{label}</span>
      </div>
      <span className={`font-mono text-sm font-semibold shrink-0 ${accent ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
