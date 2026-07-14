"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { LiveMatchCard } from "@/components/trader/MatchCards";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { HomeJsonLd } from "@/components/seo/json-ld";
import { ShareActions } from "@/components/social/share-actions";
import { DeployAgentPanel } from "@/components/wallet/deploy-agent-panel";
import { FundAgentPanel } from "@/components/wallet/fund-agent-panel";
import { useWalletStore } from "@/lib/store/wallet";

const PLATFORM_CARDS = [
  { label: "Real-time Data", sub: "Powered by TxLINE", href: (ctx: { latestSignalId?: string }) => "/matches" },
  {
    label: "AI Signals",
    sub: "Smart. Fast. Autonomous.",
    href: (ctx: { latestSignalId?: string }) => (ctx.latestSignalId ? `/signals/${ctx.latestSignalId}` : "/signals"),
  },
  {
    label: "On-Chain",
    sub: "Every prediction recorded",
    href: (ctx: { latestProofId?: string }) => (ctx.latestProofId ? `/proof/${ctx.latestProofId}` : "/portfolio"),
  },
  { label: "Performance", sub: "Every edge counts", href: () => "/portfolio" },
] as const;

export default function HomePage() {
  const wallet = useWalletStore((s) => s.wallet);
  const { data: matches } = useQuery({ queryKey: ["matches"], queryFn: () => api.liveMatches() });
  const { data: signals } = useQuery({ queryKey: ["signals"], queryFn: () => api.signals(5) });
  const { data: proof } = useQuery({ queryKey: ["latest-proof"], queryFn: () => api.latestProof() });
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: () => api.agents(), enabled: wallet.connected });

  const featured = matches?.matches.find((m) => m.status === "live") || matches?.matches[0];
  const latestSignal = signals?.signals[0];
  const alpha = agents?.agents.find((a) => a.name === "Alpha");

  const ctx = { latestSignalId: latestSignal?.id, latestProofId: proof?.predictionId ?? undefined };

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
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Platform</p>
            <ShareActions
              contentType="home"
              contentId="platform"
              title="TxLINE AI Trader — autonomous agents on live World Cup data"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {PLATFORM_CARDS.map((f) => (
              <Link
                key={f.label}
                href={f.href(ctx)}
                className="group rounded-xl border border-transparent bg-secondary/50 p-3 transition hover:border-gold/40 hover:bg-secondary/70"
              >
                <p className="font-medium text-gold group-hover:underline">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.sub}</p>
                <ChevronRight className="mt-2 h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </GlassCard>

        {wallet.connected && (
          <GlassCard delay={0.15}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Your Agents</p>
            <DeployAgentPanel />
          </GlassCard>
        )}

        {wallet.connected && alpha && (
          <GlassCard delay={0.2}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Fund System Agents</p>
            <FundAgentPanel
              agentName="Alpha"
              treasuryPubkey={alpha.treasuryPubkey}
              treasuryBalance={alpha.treasuryBalance}
              minTreasury={alpha.minTreasury}
              treasuryExplorer={alpha.treasuryExplorer}
              active={alpha.active}
            />
          </GlassCard>
        )}

        {!wallet.connected && <DeployAgentPanel />}
      </motion.div>
    </AppShell>
  );
}
