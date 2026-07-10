"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { formatPct, formatUsdc } from "@/lib/utils";

export default function PortfolioPage() {
  const { data: perf } = useQuery({ queryKey: ["performance"], queryFn: () => api.performance() });

  if (!perf) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading portfolio...</p>
      </AppShell>
    );
  }

  const equity = perf.equityCurve.length
    ? perf.equityCurve.map((p, i) => ({ i, v: p.v }))
    : Array.from({ length: 20 }, (_, i) => ({ i, v: 10000 + i * 60 + Math.sin(i) * 100 }));

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Portfolio Simulation</h1>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <GlassCard className="gold-glow mb-4 text-center">
          <p className="text-xs text-muted-foreground">Total P&L</p>
          <p className="text-3xl font-bold text-green">+{formatUsdc(perf.pnl)}</p>
          <p className="text-sm text-green">{formatPct(perf.pnlPercent)}</p>
        </GlassCard>
      </motion.div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <GlassCard>
          <p className="text-xs text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold">{perf.winRate}%</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs text-muted-foreground">Total Trades</p>
          <p className="text-2xl font-bold">{perf.totalTrades}</p>
        </GlassCard>
      </div>

      <GlassCard className="mb-4">
        <p className="mb-2 text-sm font-semibold">Equity Curve</p>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equity}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 85)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.78 0.14 85)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="oklch(0.78 0.14 85)" fill="url(#eq)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="mb-4">
        <p className="mb-2 text-sm font-semibold">Daily Performance</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perf.dailyPnl}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="oklch(0.65 0.02 250)" />
              <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.65 0.02 250)" />
              <Bar dataKey="pnl" fill="oklch(0.78 0.14 85)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard>
        <p className="mb-3 text-sm font-semibold">Recent Signals</p>
        <div className="space-y-2">
          {perf.recentSignals.map((s) => (
            <Link key={s.id} href={s.id ? `/proof/${s.id}` : "/portfolio"} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm hover:bg-secondary/60">
              <div>
                <p className="font-medium">{s.market}</p>
                <p className="text-xs text-muted-foreground">{s.prediction}</p>
              </div>
              <Badge variant={s.result === "win" ? "green" : s.result === "loss" ? "outline" : "gold"}>
                {s.result?.toUpperCase() || "PENDING"}
              </Badge>
            </Link>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
