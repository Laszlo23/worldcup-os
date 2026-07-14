"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Brain, ArrowLeft } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { ConfidenceRing } from "@/components/trader/ConfidenceRing";
import { SignalBadge } from "@/components/trader/ProbabilityBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareActions } from "@/components/social/share-actions";
import { formatPct } from "@/lib/utils";

export default function SignalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data } = useQuery({ queryKey: ["signal", id], queryFn: () => api.signal(id) });
  const { data: decisionsData } = useQuery({ queryKey: ["signal-decisions", id], queryFn: () => api.signalDecisions(id) });
  const signal = data?.signal;
  const decisions = decisionsData?.decisions ?? [];

  if (!signal) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading signal...</p>
      </AppShell>
    );
  }

  const oddsChart = [
    { t: "0s", v: 1.92 },
    { t: "20s", v: 1.85 },
    { t: "40s", v: 1.78 },
    { t: "60s", v: 1.68 },
  ];
  const confChart = [
    { t: "0m", v: 55 },
    { t: "5m", v: 62 },
    { t: "10m", v: 68 },
    { t: "15m", v: signal.confidence },
  ];

  return (
    <AppShell>
      <Link href="/signals" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <GlassCard className="purple-glow">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple/20">
              <Brain className="h-6 w-6 text-purple" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">New Signal Detected</p>
              <SignalBadge type={signal.type} impact={signal.impact} />
              <h1 className="mt-2 text-lg font-bold">{signal.headline}</h1>
            </div>
            <ConfidenceRing value={signal.confidence} />
          </div>
        </GlassCard>

        <ShareActions
          contentType="signal"
          contentId={id}
          title={signal.headline}
        />

        {decisions.length > 0 && (
          <GlassCard>
            <h2 className="mb-3 font-semibold">Agent predictions</h2>
            <div className="space-y-2">
              {decisions.map((d) => (
                <div key={`${d.agentName}-${d.action}`} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                  <span>{d.displayName ?? d.agentName}</span>
                  <span className="text-muted-foreground">{d.action} · {d.stake} USDC</span>
                  <Badge variant={d.outcome === "won" ? "green" : d.outcome === "lost" ? "outline" : "gold"}>
                    {d.outcome ?? "open"}
                  </Badge>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <h2 className="mb-3 font-semibold">Why this signal?</h2>
          <ul className="space-y-2">
            {signal.reasoning.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
          {signal.expectedValue != null && (
            <p className="mt-4 text-sm">
              Expected Value: <span className="font-bold text-green">{formatPct(signal.expectedValue)}</span>
            </p>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="mb-3 font-semibold">Key Metrics</h2>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">xG (15m)</p>
              <p className="font-mono font-bold">{String(signal.metrics.xg_next_15m || "1.45")}</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="font-bold text-green">{String(signal.metrics.attack_pressure || "HIGH")}</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Momentum</p>
              <p className="font-bold text-green">+{String(signal.metrics.momentum || "68")}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-2 text-sm font-semibold">Odds Movement (60s)</h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={oddsChart}>
                <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="oklch(0.65 0.02 250)" />
                <YAxis domain={[1.5, 2]} tick={{ fontSize: 10 }} stroke="oklch(0.65 0.02 250)" />
                <Line type="monotone" dataKey="v" stroke="oklch(0.78 0.14 85)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-2 text-sm font-semibold">Model Confidence Over Time</h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={confChart}>
                <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="oklch(0.65 0.02 250)" />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} stroke="oklch(0.65 0.02 250)" />
                <Line type="monotone" dataKey="v" stroke="oklch(0.65 0.18 300)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <Link href="/chat">
          <Button className="w-full" size="lg">Ask AI Analyst</Button>
        </Link>
      </motion.div>
    </AppShell>
  );
}
