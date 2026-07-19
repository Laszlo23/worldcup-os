import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Radio, Play, ListChecks, CheckCircle2, Activity, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { LandingMobileNav } from "@/components/landing-mobile-nav";
import { DevnetBanner } from "@/components/site/devnet-banner";
import { PartnerFooter } from "@/components/site/partner-footer";
import { MatchCard } from "@/components/match-card";
import { HeroBackground } from "@/components/landing/hero-background";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { buildProtocolMetrics } from "@/components/landing/protocol-metrics";
import { TxlineProofEngine } from "@/components/landing/txline-proof-engine";
import { OraclePreview } from "@/components/landing/oracle-preview";
import { AiIntelligencePreview } from "@/components/landing/ai-intelligence-preview";
import { ProofPreview } from "@/components/landing/proof-preview";
import { PassportPreview } from "@/components/landing/passport-preview";
import { SoccerImage } from "@/components/soccer-image";
import { SOCCER_MOMENTS } from "@/lib/soccer-assets";
import { useHealth, useMarkets } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { isMatchFeatured, selectFeaturedMatches } from "@/lib/match-phase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup OS — The Trust Layer for Sports Intelligence" },
      { name: "description", content: "Every match event becomes a cryptographically verified asset. Real-time sports intelligence powered by TxLINE. Settled automatically on Solana." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const matches = useAppStore((s) => s.matches);
  const { data: health } = useHealth();
  const { data: marketList = [] } = useMarkets();
  const featuredMatches = selectFeaturedMatches(matches, 3);

  const txlineHealthy = health?.txline?.status === "healthy";
  const protocolMetrics = buildProtocolMetrics(health?.fixtures?.total);

  const markets = marketList
    .map((mk) => ({ ...mk, match: matches.find((m) => m.id === mk.matchId) }))
    .filter((mk): mk is typeof mk & { match: NonNullable<typeof mk.match> } => Boolean(mk.match && isMatchFeatured(mk.match)))
    .slice(0, 3);

  return (
    <div className="min-h-screen">
      <DevnetBanner />
      <header className="sticky top-0 z-40 glass-strong border-b border-primary/15 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center gap-2 justify-between">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group">
            <img
              src="/brand/logo.svg"
              alt="World Cup OS"
              width={36}
              height={36}
              className="brand-mark h-9 w-9 rounded-xl shrink-0 transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-display font-bold text-sm sm:text-base truncate tracking-tight">
                World Cup OS
              </span>
              <span className="text-[9px] sm:text-[10px] text-primary/80 uppercase tracking-[0.22em] font-mono hidden sm:block">
                WMOS · Trust Layer
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-medium">
            <Link to="/oracle" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
              <Radio className="h-3.5 w-3.5" />
              Oracle
            </Link>
            <Link to="/replay" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Play className="h-3.5 w-3.5" />
              Proof Replay
            </Link>
            <Link to="/proofs" className="hover:text-foreground transition-colors">Proofs</Link>
            <Link to="/tasks" className="hover:text-foreground transition-colors">Tasks</Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <LandingMobileNav />
            <div className="hidden sm:block">
              <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-wider gap-1.5">
                <Link to="/dashboard" className="inline-flex items-center gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
              </Button>
            </div>
            <ConnectWalletButton size="sm" className="max-w-[9.5rem] sm:max-w-none" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40 min-h-[78vh] sm:min-h-[85vh] flex flex-col justify-center">
        <HeroBackground />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16">
          <div className="max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-4 sm:mb-5"
          >
            <span className="gradient-text">World Cup OS</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass neon-edge-sm font-mono text-[10px] sm:text-xs mb-5 sm:mb-6"
          >
            <span className={`h-2 w-2 rounded-full ${txlineHealthy ? "bg-primary animate-live-dot" : "bg-muted-foreground"}`} />
            <span className={`uppercase tracking-[0.15em] ${txlineHealthy ? "text-primary" : "text-muted-foreground"}`}>
              {txlineHealthy ? "TxLINE connected" : "Awaiting TxLINE feed"}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl sm:text-3xl md:text-4xl font-display font-semibold tracking-tight max-w-3xl leading-snug text-foreground/95"
          >
            The trust layer for global sports
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-4 sm:mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
          >
            Live match events, verified on-chain. TxLINE intelligence. Automatic Solana settlement.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md sm:max-w-none"
          >
            <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground border-0 gap-2 min-h-[48px] font-mono text-xs uppercase tracking-wider glow-primary">
              <Link to="/oracle" className="inline-flex items-center gap-2">
                Command Center <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <ConnectWalletButton size="lg" className="w-full sm:w-auto" />
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto glass neon-edge-sm gap-2 min-h-[48px] font-mono text-xs uppercase tracking-wider">
              <Link to="/replay" className="inline-flex items-center gap-2">
                <Play className="h-4 w-4" /> Proof Replay
              </Link>
            </Button>
          </motion.div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/40 bg-background/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {protocolMetrics.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="terminal-panel neon-edge-sm px-3 sm:px-4 py-3 sm:py-4"
              >
                <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{s.label}</div>
                <div className="text-xl sm:text-2xl font-display font-bold tabular-nums text-foreground">
                  {s.animate && s.numericValue ? (
                    <AnimatedCounter value={s.numericValue} duration={1800 + i * 200} />
                  ) : (
                    s.value
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TxlineProofEngine />
      <OraclePreview />
      <AiIntelligencePreview />

      {/* Live matches */}
      {featuredMatches.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 border-t border-border/40 overflow-hidden">
          <SoccerImage
            src={SOCCER_MOMENTS.topbin.src}
            alt=""
            overlay="none"
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            imgClassName="object-cover object-center"
          />
          <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="section-label text-primary mb-2">Live intelligence</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Match Feed</h2>
            </div>
            <Link to="/matches" className="font-mono text-xs text-primary hover:underline uppercase tracking-wider">
              View all matches →
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-4">
            {featuredMatches.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <MatchCard match={m} />
              </motion.div>
            ))}
          </div>
          </div>
        </section>
      )}

      {/* Markets */}
      {markets.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 border-t border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="section-label text-accent mb-2">Financial instruments</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Prediction Markets</h2>
              <p className="text-muted-foreground text-sm mt-2">Oracle-settled. Non-custodial. Transparent liquidity.</p>
            </div>
            <Link to="/markets" className="font-mono text-xs text-primary hover:underline uppercase tracking-wider">
              All markets →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {markets.map((mk, i) => {
              const top = mk.outcomes[0];
              const prob = top ? Math.round((1 / top.price) * 100) : 0;
              return (
                <motion.div
                  key={mk.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="instrument-card rounded-xl p-5 flex flex-col hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {mk.match!.home.code} vs {mk.match!.away.code}
                    </span>
                    <span className="text-[10px] font-mono text-accent flex items-center gap-1">
                      <Activity className="h-3 w-3" /> {mk.totalLiquidity > 0 ? `$${(mk.totalLiquidity / 1000).toFixed(0)}k liq` : "No volume yet"}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-4">{top?.label ?? mk.title}</h3>
                  <div className="grid grid-cols-2 gap-3 flex-1 font-mono text-xs">
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase">Liquidity</div>
                      <div className="text-sm font-semibold mt-0.5">${top?.liquidity.toLocaleString() ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase">Participants</div>
                      <div className="text-sm font-semibold mt-0.5">{top?.participants ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase">Probability</div>
                      <div className="text-sm font-semibold text-primary mt-0.5">{prob}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase">Price</div>
                      <div className="text-sm font-semibold mt-0.5">{top?.price.toFixed(2) ?? "—"}</div>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full glass font-mono text-[10px] uppercase tracking-wider mt-4">
                    <Link to="/matches/$id" params={{ id: mk.match!.id }} className="inline-flex items-center justify-center gap-1">
                      Trade <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      <ProofPreview />
      <PassportPreview />

      {/* Demo links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 border-t border-border/40">
        <div className="text-center mb-10">
          <p className="section-label mb-3">Protocol demo</p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Explore the Stack</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Radio, title: "Oracle Command Center", desc: "Live TxLINE pipeline terminal", to: "/oracle" },
            { icon: Play, title: "Proof Replay", desc: "Watch a goal become truth — goal to certificate", to: "/replay" },
            { icon: CheckCircle2, title: "Proof Certificates", desc: "Cryptographic verification", to: "/proofs" },
            { icon: ListChecks, title: "Community Tasks", desc: "Earn points, grow the network", to: "/tasks" },
          ].map((item, i) => (
            <Link key={item.to} to={item.to}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="glass-strong neon-edge-sm p-6 rounded-2xl h-full hover:border-primary/45 transition-all group hover:-translate-y-0.5"
              >
                <item.icon className="h-7 w-7 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary mb-2">Superteam Earn Agents</p>
              <h2 className="font-display text-xl font-semibold mb-1">Agent economy on live sports data</h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Discover bounties, monitor TxLINE health, and route agent payouts through Superteam Earn. AgentX exposes opportunities and external decision APIs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://superteam.fun/earn/agents"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <Activity className="h-4 w-4" /> Earn Agents
              </a>
              <a
                href="https://agentx.buildingcultureid.space/arena"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                AgentX Arena <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[10px] sm:text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> TxLINE Oracle</div>
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Solana settlement</div>
          <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-accent" /> Real-time stream</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Non-custodial</div>
        </div>
      </section>

      <PartnerFooter />
    </div>
  );
}
