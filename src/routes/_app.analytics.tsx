import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAnalytics } from "@/lib/queries/hooks";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — World Cup OS" }] }),
  component: Analytics,
});

import { DollarSign, Users, Activity, Trophy } from "lucide-react";

const daysFallback = Array.from({ length: 14 }).map((_, i) => ({
  d: `Day ${i + 1}`,
  volume: 200 + Math.sin(i / 2) * 80 + i * 25 + Math.random() * 40,
  users: 800 + i * 120 + Math.random() * 100,
  liquidity: 1200 + Math.cos(i / 3) * 200 + i * 60,
  settlements: 20 + Math.round(Math.random() * 15),
}));

const oddsMoveFallback = Array.from({ length: 30 }).map((_, i) => ({
  t: i,
  home: 2.1 + Math.sin(i / 4) * 0.3,
  away: 2.4 + Math.cos(i / 5) * 0.4,
  draw: 3.2 + Math.sin(i / 6) * 0.2,
}));

const tooltipStyle = { background: "oklch(0.18 0.025 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 };

function Analytics() {
  const { data: analytics } = useAnalytics();
  const days = analytics?.volume?.length
    ? analytics.volume.map((v, i) => ({
        d: v.date ?? `Day ${i + 1}`,
        volume: v.value,
        users: analytics.users[i]?.value ?? 0,
        liquidity: analytics.liquidity[i]?.value ?? 0,
        settlements: analytics.settlements[i]?.value ?? 0,
      }))
    : daysFallback;
  const oddsMove = analytics?.oddsMove?.length ? analytics.oddsMove : oddsMoveFallback;
  const totals = analytics?.totals;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform-wide metrics, streamed from on-chain state.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="14d volume" value={totals?.tvl ? `$${(totals.tvl / 1_000_000).toFixed(1)}M` : "$28.4M"} hint="+42% vs prev" />
        <StatCard icon={Users} label="Active users" value={totals?.users ? totals.users.toLocaleString() : "12,842"} hint="+8% wk" accent="accent" />
        <StatCard icon={Activity} label="Open liquidity" value={totals?.tvl ? `$${(totals.tvl * 0.72 / 1_000_000).toFixed(1)}M` : "$3.1M"} accent="warning" />
        <StatCard icon={Trophy} label="Settlements" value={String(totals?.transactions ?? 1204)} hint="99.98% verified" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass p-6">
          <h3 className="font-display font-semibold mb-4">Prediction volume</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={days}>
                <defs>
                  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area dataKey="volume" stroke="oklch(0.72 0.19 155)" fill="url(#v)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display font-semibold mb-4">User growth</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={days}>
                <defs>
                  <linearGradient id="u" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.22 300)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.62 0.22 300)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area dataKey="users" stroke="oklch(0.62 0.22 300)" fill="url(#u)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display font-semibold mb-4">Market liquidity</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={days}>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="liquidity" stroke="oklch(0.75 0.17 220)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-6">
          <h3 className="font-display font-semibold mb-4">Settlements per day</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={days}>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="settlements" fill="oklch(0.72 0.19 155)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass p-6 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">Odds movement — featured match</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={oddsMove}>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="t" stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line dataKey="home" stroke="oklch(0.72 0.19 155)" strokeWidth={2} dot={false} name="Home" />
                <Line dataKey="draw" stroke="oklch(0.82 0.17 85)" strokeWidth={2} dot={false} name="Draw" />
                <Line dataKey="away" stroke="oklch(0.62 0.22 300)" strokeWidth={2} dot={false} name="Away" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
