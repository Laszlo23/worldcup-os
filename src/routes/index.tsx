import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Radio, Trophy, Users, DollarSign, CheckCircle2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { StatCard } from "@/components/stat-card";
import { useAppStore } from "@/lib/store";
import { useDashboard } from "@/lib/queries/hooks";
import { MatchCard } from "@/components/match-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup OS — Predict the World Cup. Trust the Blockchain." },
      { name: "description", content: "Real-time World Cup prediction markets powered by TxLINE with automatic on-chain settlement on Solana." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const matches = useAppStore((s) => s.matches);
  const { data: dashboard } = useDashboard();
  const live = matches.filter((m) => m.status === "live" || m.status === "halftime");
  const totals = dashboard?.totals;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-base">World Cup OS</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">TxLINE · Solana</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/matches" className="hover:text-foreground transition-colors">Matches</Link>
            <Link to="/markets" className="hover:text-foreground transition-colors">Markets</Link>
            <Link to="/proofs" className="hover:text-foreground transition-colors">Proofs</Link>
            <Link to="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <ConnectWalletButton size="sm" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute top-40 right-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs mb-8"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-live-dot" />
            <span className="text-muted-foreground">Live TxLINE feed connected</span>
            <span className="text-primary">· {live.length} matches now</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight max-w-4xl mx-auto"
          >
            Predict the World Cup.<br />
            <span className="gradient-text">Trust the Blockchain.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Real-time prediction markets powered by TxLINE with automatic, cryptographically verifiable on-chain settlement on Solana.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-3 flex-wrap"
          >
            <ConnectWalletButton size="lg" />
            <Link to="/matches">
              <Button size="lg" variant="outline" className="glass">
                Explore Matches <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 flex items-center justify-center gap-8 flex-wrap text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> TxLINE verified oracles</div>
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Sub-second Solana settlement</div>
            <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-primary" /> Real-time SSE data feed</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Non-custodial escrow</div>
          </motion.div>
        </div>
      </section>

      {/* Metrics */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Radio} label="Live Matches" value={String(totals?.liveMatches ?? live.length)} accent="destructive" />
          <StatCard icon={DollarSign} label="Prediction Volume" value={totals?.tvl ? `$${(totals.tvl / 1_000_000).toFixed(2)}M` : "$4.28M"} hint="Last 24h" />
          <StatCard icon={Activity} label="Active Markets" value={String(totals?.markets ?? 128)} accent="accent" />
          <StatCard icon={Users} label="Total Users" value={totals?.users ? totals.users.toLocaleString() : "12,842"} />
          <StatCard icon={CheckCircle2} label="Matches Settled" value={String(totals?.transactions ?? 1204)} accent="warning" />
          <StatCard icon={DollarSign} label="USDC Paid Out" value={totals?.tvl ? `$${(totals.tvl * 0.45 / 1_000_000).toFixed(2)}M` : "$1.92M"} />
        </div>
      </section>

      {/* Live matches */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Live now</h2>
            <p className="text-muted-foreground mt-2">Live scores stream from the TxLINE oracle. Markets settle the instant the final whistle is verified.</p>
          </div>
          <Link to="/matches"><Button variant="ghost">View all <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.slice(0, 6).map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Trustless by design</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Every prediction is locked in a Solana escrow. Every result is signed by TxLINE. Every payout is automatic.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Radio, title: "TxLINE streams live data", desc: "Verified match events flow through TxLINE's SSE feed with sub-second latency." },
            { icon: ShieldCheck, title: "Solana escrow locks funds", desc: "Predictions are non-custodial. Funds are held by an Anchor program you can inspect." },
            { icon: CheckCircle2, title: "Automatic on-chain settlement", desc: "Final whistle triggers a signed proof — payouts hit winners' wallets in seconds." },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="glass p-8 rounded-2xl h-full">
                <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary mb-4">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} World Cup OS · Non-custodial, open protocol</div>
          <div className="flex items-center gap-6">
            <span>Powered by TxLINE</span>
            <span>Settled on Solana</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
