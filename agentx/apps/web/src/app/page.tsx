"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { LiveMatchCard } from "@/components/trader/MatchCards";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { HomeJsonLd } from "@/components/seo/json-ld";

export default function HomePage() {
  const { data: matches } = useQuery({ queryKey: ["matches"], queryFn: () => api.liveMatches() });
  const { data: signals } = useQuery({ queryKey: ["signals"], queryFn: () => api.signals(5) });

  const featured = matches?.matches.find((m) => m.status === "live") || matches?.matches[0];
  const latestSignal = signals?.signals[0];

  return (
    <AppShell showDisclaimer>
      <HomeJsonLd />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Live Match Center</h1>
          <Badge variant="green">TxLINE Feed</Badge>
        </div>

        {featured && <LiveMatchCard match={featured} signal={latestSignal} />}

        <GlassCard delay={0.1}>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Platform</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Real-time Data", sub: "Powered by TxLINE" },
              { label: "AI Signals", sub: "Smart. Fast. Autonomous." },
              { label: "On-Chain", sub: "Every prediction recorded" },
              { label: "Performance", sub: "Every edge counts" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-secondary/50 p-3">
                <p className="font-medium text-gold">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.sub}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
