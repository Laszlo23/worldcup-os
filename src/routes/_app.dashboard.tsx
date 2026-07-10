import { createFileRoute, Link } from "@tanstack/react-router";
import { StatCard } from "@/components/stat-card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { Activity, DollarSign, TrendingUp, Trophy, Radio, CheckCircle2, ArrowRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAnalytics, useHealth, useLiveEvents, usePortfolio } from "@/lib/queries/hooks";
import { normalizeLiveEvents } from "@/lib/live-events";
import { statusCountsForMatches, selectFeaturedMatches } from "@/lib/match-phase";
import { MatchCard } from "@/components/match-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — World Cup OS" }] }),
  component: Dashboard,
});

const volumeFallback: { h: string; v: number }[] = [];

function Dashboard() {
  const matches = useAppStore((s) => s.matches);
  const wallet = useAppStore((s) => s.wallet);
  const preds = useAppStore((s) => s.predictions);
  const { data: analytics } = useAnalytics();
  const { data: portfolio } = usePortfolio();
  const { data: health } = useHealth();
  const { data: liveEventsRaw } = useLiveEvents();
  const liveEvents = normalizeLiveEvents(liveEventsRaw ?? []);
  const open = preds.filter((p) => p.status === "open").length;
  const phaseCounts = statusCountsForMatches(matches);
  const liveNow = phaseCounts.live + phaseCounts.inProgress;
  const featuredMatches = selectFeaturedMatches(matches, 6);
  const volumeChart = analytics?.volume?.length
    ? analytics.volume.slice(-14).map((d) => ({ h: d.date.slice(5), v: d.value }))
    : volumeFallback;
  const volumeToday = analytics?.totals?.volumeToday ?? 0;
  const volumeTodayLabel = volumeToday > 0
    ? `$${volumeToday >= 1000 ? (volumeToday / 1000).toFixed(1) + "k" : volumeToday.toFixed(0)}`
    : "—";
  const totalVolumeLabel = analytics?.totals?.tvl
    ? `$${analytics.totals.tvl >= 1000 ? (analytics.totals.tvl / 1000).toFixed(1) + "k" : analytics.totals.tvl.toFixed(0)}`
    : "—";
  const myVolumeToday = portfolio
    ? [...(portfolio.open ?? []), ...(portfolio.won ?? []), ...(portfolio.lost ?? []), ...(portfolio.settled ?? [])]
        .filter((p) => {
          const day = new Date(p.placedAt).toISOString().slice(0, 10);
          const today = new Date().toISOString().slice(0, 10);
          return day === today;
        })
        .reduce((sum, p) => sum + p.amount, 0)
    : 0;
  const txlineHealthy = health?.txline?.status === "healthy";
  const lastProof = liveEvents?.find((e) => e.event_type === "proof_verified");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-3xl font-display font-bold">Welcome back{wallet.connected ? "" : ""}</h1>
          <p className="text-muted-foreground mt-1">Live World Cup markets, verified by TxLINE.</p>
        </div>
        <DataSourceBadge source="txline" />
        <DataSourceBadge source="indexed" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Radio} label="Live / in progress" value={String(liveNow)} accent="destructive" />
        <StatCard icon={Activity} label="Open predictions" value={String(open)} accent="accent" />
        <StatCard icon={DollarSign} label="USDC balance" value={wallet.connected ? wallet.balance.toFixed(2) : "—"} />
        <StatCard icon={TrendingUp} label="Today's volume" value={volumeTodayLabel} accent="primary" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">Platform volume</h3>
              <p className="text-xs text-muted-foreground">Indexed prediction stakes · daily buckets (14d)</p>
            </div>
            <span className="text-2xl font-display font-bold gradient-text">{totalVolumeLabel}</span>
          </div>
          <div className="h-64">
            {volumeChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeChart}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis dataKey="h" stroke="oklch(0.68 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }} />
                  <Area dataKey="v" stroke="oklch(0.72 0.19 155)" fill="url(#g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No prediction volume yet</div>
            )}
          </div>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Live events</h3>
          <ScrollArea className="h-64 pr-2">
            <div className="space-y-3">
              {(liveEvents ?? []).slice(0, 12).map((e) => (
                <div key={e.id} className="text-sm border-b border-border/50 pb-2">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">{e.body}</div>
                </div>
              ))}
              {!liveEvents?.length && (
                <p className="text-sm text-muted-foreground">Waiting for TxLINE stream events…</p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Featured matches
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/matches">All matches <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-4">
            {featuredMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
            {featuredMatches.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">No live or upcoming fixtures right now. Finished matches are on the Matches page.</p>
            )}
          </div>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Your activity</h3>
          <div className="space-y-4">
            <Row label="Predictions" value={String(preds.length)} />
            <Row label="Open" value={String(open)} />
            <Row label="Today's volume" value={wallet.connected && myVolumeToday > 0 ? `${myVolumeToday.toFixed(0)} USDC` : wallet.connected ? "—" : "—"} />
            <Row label="Won" value={String(preds.filter((p) => p.status === "won" || p.status === "settled").length)} />
            <Row label="Win rate" value={preds.length ? `${Math.round((preds.filter((p) => p.status === "won" || p.status === "settled").length / preds.length) * 100)}%` : "—"} />
          </div>
          <Button asChild variant="outline" className="w-full glass mt-6">
            <Link to="/portfolio" className="w-full">Open portfolio <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </div>

      <div className="glass rounded-2xl p-6 flex items-center gap-4 border border-primary/20">
        <div className="h-11 w-11 rounded-xl bg-primary/20 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">
            TxLINE oracle status:{" "}
            <span className={txlineHealthy ? "text-primary" : "text-warning"}>
              {txlineHealthy ? "Healthy" : health?.txline?.status ?? "Unknown"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            SL{health?.txline?.serviceLevel ?? 12} · SSE {health?.txline?.lastSseAt ? "active" : "idle"}
            {typeof health?.fixtures?.total === "number" ? ` · fixtures ${health.fixtures.total}` : ""}
            {lastProof ? ` · last proof ${new Date(lastProof.created_at).toLocaleTimeString()}` : ""}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="glass">
          <Link to="/proofs">View proofs</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}
