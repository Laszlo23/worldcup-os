"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Brain, Radio, Shield, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { LiveMatchCard, SignalCard } from "@/components/trader/MatchCards";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { HomeJsonLd } from "@/components/seo/json-ld";
import { ShareActions } from "@/components/social/share-actions";
import { DeployAgentPanel } from "@/components/wallet/deploy-agent-panel";
import { FundAgentPanel } from "@/components/wallet/fund-agent-panel";
import { useWalletStore } from "@/lib/store/wallet";
import { pickFeaturedMatch, isLiveTabMatch } from "@/lib/match-phase";
import { useTraderSocketConnected } from "@/lib/trader-socket-provider";

const PLATFORM_CARDS = [
  { label: "Live Data", sub: "TxLINE feed", icon: Radio, href: () => "/matches" },
  {
    label: "AI Signals",
    sub: "Autonomous picks",
    icon: Brain,
    href: (ctx: { latestSignalId?: string }) => (ctx.latestSignalId ? `/signals/${ctx.latestSignalId}` : "/signals"),
  },
  {
    label: "On-Chain",
    sub: "Proof on Solana",
    icon: Shield,
    href: (ctx: { latestProofId?: string }) => (ctx.latestProofId ? `/proof/${ctx.latestProofId}` : "/portfolio"),
  },
  { label: "Performance", sub: "Track the edge", icon: TrendingUp, href: () => "/portfolio" },
] as const;

export default function HomePage() {
  const wallet = useWalletStore((s) => s.wallet);
  const feedConnected = useTraderSocketConnected();
  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: () => api.liveMatches(),
    staleTime: 5_000,
    refetchInterval: 20_000,
  });
  const { data: signals } = useQuery({
    queryKey: ["signals"],
    queryFn: () => api.signals(5),
    staleTime: 5_000,
    refetchInterval: 20_000,
  });
  const { data: proof } = useQuery({ queryKey: ["latest-proof"], queryFn: () => api.latestProof() });
  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: () => api.agents(), enabled: wallet.connected });

  const matches = matchesData?.matches ?? [];
  const latestSignal = signals?.signals[0];

  const featured = useMemo(
    () => matchesData?.featured ?? pickFeaturedMatch(matches, { signalMatchId: latestSignal?.matchId }),
    [matches, matchesData?.featured, latestSignal?.matchId],
  );

  const featuredSignal = useMemo(() => {
    if (!featured) return latestSignal;
    return signals?.signals.find((s) => s.matchId === featured.id) ?? latestSignal;
  }, [featured, latestSignal, signals?.signals]);

  const recommendationSignals = useMemo(() => {
    const list = signals?.signals ?? [];
    if (!featured) return list.slice(0, 3);
    const forFeatured = list.filter((s) => s.matchId === featured.id);
    if (forFeatured.length) return forFeatured.slice(0, 3);
    return list.slice(0, 3);
  }, [signals?.signals, featured]);

  const alpha = agents?.agents.find((a) => a.name === "Alpha");
  const ctx = { latestSignalId: latestSignal?.id, latestProofId: proof?.predictionId ?? undefined };
  const inPlay = featured ? isLiveTabMatch(featured) : false;

  return (
    <AppShell showDisclaimer backdropVariant="action" backdropIntensity="hero">
      <HomeJsonLd />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        <section className="relative overflow-hidden rounded-2xl glass-strong p-5">
          <div className="pointer-events-none absolute inset-0 ambient-orbs" aria-hidden />
          <div className="relative space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-label mb-1.5 text-gold/80">AgentX · Live Arena</p>
                <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-[1.7rem]">
                  <span className="gold-text">Signal Arena</span>
                </h1>
                <p className="mt-1.5 max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
                  Featured fixture, live TxLINE odds, AI agent picks — one desk.
                </p>
              </div>
              <Badge variant={feedConnected ? "green" : "outline"} className="shrink-0 font-mono tracking-wider">
                {feedConnected ? (
                  <>
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green animate-live-dot" />
                    LIVE
                  </>
                ) : (
                  "FEED"
                )}
              </Badge>
            </div>
          </div>
        </section>

        {featured ? (
          <LiveMatchCard match={featured} signal={featuredSignal} />
        ) : (
          <GlassCard strong>
            <p className="text-sm text-muted-foreground">Waiting for the next live fixture from TxLINE…</p>
          </GlassCard>
        )}

        {recommendationSignals.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple/15 text-purple">
                  <Brain className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold">AI Recommendations</p>
                  <p className="text-[11px] text-muted-foreground">Fresh signals from the feed</p>
                </div>
              </div>
              <Link href="/signals" className="text-xs font-medium text-gold hover:underline">
                View all
              </Link>
            </div>
            <div>
              {recommendationSignals.map((s) => (
                <SignalCard key={s.id} signal={s} />
              ))}
            </div>
          </section>
        )}

        {inPlay && featured && (
          <Link
            href={`/matches/${featured.id}`}
            className="group flex items-center justify-center gap-2 rounded-2xl gold-gradient px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_8px_28px_oklch(0.82_0.145_88_/_0.28)] transition hover:brightness-110"
          >
            Trade live · {featured.homeTeam.name} vs {featured.awayTeam.name}
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        )}

        <GlassCard delay={0.08}>
          <div className="mb-3 flex items-center justify-between">
            <p className="section-label">Explore</p>
            <ShareActions
              contentType="home"
              contentId="platform"
              title="AgentX — autonomous agents on live TxLINE data"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {PLATFORM_CARDS.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.label}
                  href={f.href(ctx)}
                  className="group rounded-xl border border-border/60 bg-secondary/40 p-3.5 transition hover:border-gold/35 hover:bg-secondary/70"
                >
                  <Icon className="mb-2 h-4 w-4 text-gold transition group-hover:scale-110" />
                  <p className="font-display text-sm font-semibold tracking-tight">{f.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{f.sub}</p>
                </Link>
              );
            })}
          </div>
        </GlassCard>

        {wallet.connected && (
          <GlassCard delay={0.12}>
            <p className="section-label mb-3">Your Agents</p>
            <DeployAgentPanel />
          </GlassCard>
        )}

        {wallet.connected && alpha && (
          <GlassCard delay={0.16}>
            <p className="section-label mb-3">Fund System Agents</p>
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
