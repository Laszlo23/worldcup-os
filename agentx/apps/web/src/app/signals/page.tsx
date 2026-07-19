"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { SignalCard } from "@/components/trader/MatchCards";
import { GlassCard } from "@/components/trader/GlassCard";

export default function SignalsPage() {
  const { data } = useQuery({
    queryKey: ["signals"],
    queryFn: () => api.signals(30),
    refetchInterval: 20_000,
  });

  return (
    <AppShell showDisclaimer backdropVariant="action" backdropIntensity="hero">
      <div className="mb-5 space-y-1">
        <p className="section-label text-gold/80">Autonomous · TxLINE</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          <span className="gold-text">AI Signals</span>
        </h1>
        <p className="text-sm text-muted-foreground">Fresh recommendations every ~20s from live feed data</p>
      </div>
      {data?.signals.map((s) => (
        <SignalCard key={s.id} signal={s} />
      ))}
      {!data?.signals.length && (
        <GlassCard>
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-purple" />
            <p className="text-sm text-muted-foreground">Waiting for the next signal cycle…</p>
          </div>
        </GlassCard>
      )}
    </AppShell>
  );
}
