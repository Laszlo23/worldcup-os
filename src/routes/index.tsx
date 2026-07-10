import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Radio, Trophy, Play, ListChecks, CheckCircle2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { LandingMobileNav } from "@/components/landing-mobile-nav";
import { MatchCard } from "@/components/match-card";
import { HeroBackground } from "@/components/landing/hero-background";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { OraclePreview } from "@/components/landing/oracle-preview";
import { OracleSettlementTimeline } from "@/components/landing/oracle-settlement-timeline";
import { TrustPipeline } from "@/components/landing/trust-pipeline";
import { ProofPreview } from "@/components/landing/proof-preview";
import { PassportPreview } from "@/components/landing/passport-preview";
import { SoccerImage } from "@/components/soccer-image";
import { SOCCER_MOMENTS } from "@/lib/soccer-assets";
import { useDashboard, useHealth, useMarkets } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { isMatchFeatured, selectFeaturedMatches } from "@/lib/match-phase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup OS — The Trust Layer for Sports Intelligence" },
      { name: "description", content: "Real-time sports intelligence powered by TxLINE. Verified by cryptographic proofs. Settled automatically on Solana." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const matches = useAppStore((s) => s.matches);
  const { data: dashboard } = useDashboard();
  const { data: health } = useHealth();
  const { data: marketList = [] } = useMarkets();
  const featuredMatches = selectFeaturedMatches(matches, 3);
  const totals = dashboard?.totals;

  const txlineHealthy = health?.txline?.status === "healthy";

  const stats = {
    matches: health?.fixtures?.total ?? totals?.liveMatches ?? matches.length,
    predictions: totals?.predictions ?? totals?.transactions ?? 0,
    volume: totals?.volumeToday ?? totals?.tvl ?? 0,
    settlements: totals?.markets ?? 0,
  };

  const formatVolume = (n: number) => {
    if (n <= 0) return "—";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
    return `$${n.toFixed(0)}`;
  };

  const markets = marketList
    .map((mk) => ({ ...mk, match: matches.find((m) => m.id === mk.matchId) }))
    .filter((mk): mk is typeof mk & { match: NonNullable<typeof mk.match> } => Boolean(mk.match && isMatchFeatured(mk.match)))
    .slice(0, 3);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/80 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 group">
            <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center glow-primary shrink-0 group-hover:border-primary/50 transition-colors">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-display font-bold text-sm sm:text-base truncate tracking-tight">World Cup OS</span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-mono hidden sm:block">
                Trust Layer · Solana
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-medium">
            <Link to="/oracle" className="hover:text-primary transition-colors">Oracle</Link>
            <Link to="/replay" className="hover:text-foreground transition-colors">Replay</Link>
            <Link to="/proofs" className="hover:text-foreground transition-colors">Proofs</Link>
            <Link to="/tasks" className="hover:text-foreground transition-colors">Tasks</Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <LandingMobileNav />
            <div className="hidden sm:block">
              <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-wider">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            </div>
            <ConnectWalletButton size="sm" className="max-w-[9.5rem] sm:max-w-none" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <HeroBackground />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-10 sm:pb-14">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] gap-10 lg:gap-12 items-center">
            <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass neon-edge-sm font-mono text-[10px] sm:text-xs mb-6 sm:mb-8"
          >
            <span className={`h-2 w-2 rounded-full ${txlineHealthy ? "bg-primary animate-live-dot" : "bg-muted-foreground"}`} />
            <span className={`uppercase tracking-[0.15em] ${txlineHealthy ? "text-primary" : "text-muted-foreground"}`}>
              {txlineHealthy ? "TxLINE connected" : "Awaiting TxLINE feed"}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight max-w-4xl leading-[1.05]"
          >
            The Trust Layer For{" "}
            <span className="gradient-text">Global Sports</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed"
          >
            Real-time sports intelligence powered by TxLINE. Verified by cryptographic proofs. Settled automatically on Solana.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl"
          >
            {[
              { label: "Fixtures indexed", value: stats.matches, suffix: "", format: null as null | ((n: number) => string) },
              { label: "Predictions", value: stats.predictions, suffix: "", format: null },
              { label: "Volume", value: stats.volume, prefix: "", suffix: "", format: formatVolume },
              { label: "Markets", value: stats.settlements, suffix: "", format: null },
            ].map((s, i) => (
              <div key={s.label} className="terminal-panel neon-edge-sm px-3 sm:px-4 py-3 sm:py-4">
                <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{s.label}</div>
                <div className="text-xl sm:text-2xl font-display font-bold tabular-nums text-foreground">
                  {s.format ? (
                    s.format(s.value)
                  ) : s.value > 0 ? (
                    <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} duration={1800 + i * 200} />
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
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
                <Play className="h-4 w-4" /> Replay
              </Link>
            </Button>
          </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="lg:hidden mt-8"
            >
              <SoccerImage
                src={SOCCER_MOMENTS.volley.src}
                alt={SOCCER_MOMENTS.volley.alt}
                overlay="strong"
                className="aspect-[16/10] rounded-2xl border border-primary/25 neon-edge-sm"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="hidden lg:block"
            >
              <SoccerImage
                src={SOCCER_MOMENTS.volley.src}
                alt={SOCCER_MOMENTS.volley.alt}
                overlay="strong"
                loading="eager"
                fetchPriority="high"
                className="aspect-[4/5] rounded-2xl border border-primary/25 neon-edge-sm shadow-2xl"
                imgClassName="object-[center_20%]"
              />
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Stadium-grade match intelligence
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <OraclePreview />

      <OracleSettlementTimeline />

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
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive mb-2">Live intelligence</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold">Match Feed</h2>
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
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-2">Financial instruments</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold">Prediction Markets</h2>
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

      <TrustPipeline />
      <ProofPreview />
      <PassportPreview />

      {/* Demo links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 border-t border-border/40">
        <div className="text-center mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Protocol demo</p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold">Explore the Stack</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Radio, title: "Oracle Command Center", desc: "Live TxLINE pipeline terminal", to: "/oracle" },
            { icon: Play, title: "Replay Mode", desc: "90-second match lifecycle demo", to: "/replay" },
            { icon: CheckCircle2, title: "Proof Certificates", desc: "Cryptographic verification", to: "/proofs" },
            { icon: ListChecks, title: "Community Tasks", desc: "Earn points, grow the network", to: "/tasks" },
          ].map((item, i) => (
            <Link key={item.to} to={item.to}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="glass neon-edge-sm p-6 rounded-xl h-full hover:border-primary/40 transition-all group"
              >
                <item.icon className="h-7 w-7 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border/40 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[10px] sm:text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> TxLINE SL12</div>
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Solana settlement</div>
          <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-accent" /> Real-time stream</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Non-custodial</div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div>© {new Date().getFullYear()} World Cup OS · Trust Layer Protocol</div>
          <div className="flex items-center gap-6 uppercase tracking-wider">
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <span>TxLINE</span>
            <span>Solana</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
