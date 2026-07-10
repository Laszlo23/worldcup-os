import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAnalytics } from "@/lib/queries/hooks";
import { DollarSign, Users, Activity, Trophy } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — World Cup OS" }] }),
  component: Analytics,
});

const tooltipStyle = { background: "oklch(0.18 0.025 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 };

function Analytics() {
  const { data: analytics, isLoading } = useAnalytics();
  const days = analytics?.volume ?? [];
  const oddsMove = analytics?.oddsMove ?? [];
  const totals = analytics?.totals;
  const hasData = days.length > 0 || (totals?.transactions ?? 0) > 0;

  const fmtUsd = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-3xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform metrics from Postgres — predictions, escrows, and verified proofs.</p>
        </div>
        <DataSourceBadge source="indexed" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total volume" value={totals?.tvl ? fmtUsd(totals.tvl) : "—"} />
        <StatCard icon={DollarSign} label="Today's volume" value={totals?.volumeToday ? fmtUsd(totals.volumeToday) : "—"} accent="primary" />
        <StatCard icon={Users} label="Users" value={totals?.users ? String(totals.users) : "—"} accent="accent" />
        <StatCard icon={Activity} label="Predictions" value={totals?.predictions ? String(totals.predictions) : "—"} accent="warning" />
      </div>

      {!hasData && !isLoading && (
        <Card className="glass p-8 text-center text-muted-foreground text-sm">
          No platform activity yet. Place predictions or run a replay settlement to populate charts.
        </Card>
      )}

      {hasData && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass p-6">
            <h3 className="font-display font-semibold mb-4">Prediction volume (14d)</h3>
            <div className="h-64">
              {days.length ? (
                <ResponsiveContainer>
                  <AreaChart data={days}>
                    <defs>
                      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                    <XAxis dataKey="date" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                    <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area dataKey="value" stroke="oklch(0.72 0.19 155)" fill="url(#v)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No volume data yet</div>
              )}
            </div>
          </Card>

          <Card className="glass p-6">
            <h3 className="font-display font-semibold mb-4">Verified settlements (14d)</h3>
            <div className="h-64">
              {(analytics?.settlements?.length ?? 0) > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={analytics?.settlements}>
                    <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                    <XAxis dataKey="date" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                    <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="oklch(0.72 0.19 155)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No verified proofs yet</div>
              )}
            </div>
          </Card>

          {oddsMove.length > 0 && (
            <Card className="glass p-6 lg:col-span-2">
              <h3 className="font-display font-semibold mb-4">Odds movement</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={oddsMove}>
                    <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                    <XAxis dataKey="t" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                    <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line dataKey="home" stroke="oklch(0.72 0.19 155)" dot={false} strokeWidth={2} />
                    <Line dataKey="away" stroke="oklch(0.68 0.15 250)" dot={false} strokeWidth={2} />
                    <Line dataKey="draw" stroke="oklch(0.75 0.12 85)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
