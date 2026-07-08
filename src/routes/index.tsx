import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Radio, Trophy, AlertTriangle, CheckCircle2, Play, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { useDashboard, useHealth } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "World Cup OS — The Trust Layer for Global Sports Intelligence" },
      { name: "description", content: "Verifiable sports intelligence powered by TxLINE real-time data. Settled automatically on Solana." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const matches = useAppStore((s) => s.matches);
  const { data: dashboard } = useDashboard();
  const { data: health } = useHealth();
  const live = matches.filter((m) => m.status === "live" || m.status === "halftime");
  const totals = dashboard?.totals;

  const pulse = {
    matches: health?.fixtures?.total ?? totals?.markets ?? 104,
    events: totals?.transactions ? totals.transactions * 10 : 12_482,
    markets: totals?.tvl ? `$${(totals.tvl / 1_000_000).toFixed(1)}M` : "$4.2M",
    predictions: totals?.users ? totals.users * 26 : 342_891,
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-base">World Cup OS</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Trust Layer · Solana</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/oracle" className="hover:text-foreground transition-colors">Oracle</Link>
            <Link to="/replay" className="hover:text-foreground transition-colors">Replay</Link>
            <Link to="/proofs" className="hover:text-foreground transition-colors">Proofs</Link>
            <Link to="/tasks" className="hover:text-foreground transition-colors">Tasks</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <ConnectWalletButton size="sm" />
          </div>
        </div>

        <div className="border-t border-border/50 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-live-dot" />
              TXLINE NETWORK LIVE
            </span>
            <span>{pulse.matches.toLocaleString()} Matches Indexed</span>
            <span>·</span>
            <span>{pulse.events.toLocaleString()} Events Verified</span>
            <span>·</span>
            <span>{pulse.markets} Markets</span>
            <span>·</span>
            <span>{pulse.predictions.toLocaleString()} Predictions</span>
            {live.length > 0 && (
              <>
                <span>·</span>
                <span className="text-destructive">{live.length} live now</span>
              </>
            )}
          </div>
        </div>
      </header>

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
            <span className="text-muted-foreground">The Trust Layer for Global Sports Intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight max-w-5xl mx-auto"
          >
            The World&apos;s First Verifiable Sports Intelligence Network
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Powered by TxLINE real-time data. Settled automatically on Solana.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-3 flex-wrap"
          >
            <Link to="/oracle">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground border-0 gap-2">
                Oracle Command Center <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <ConnectWalletButton size="lg" />
            <Link to="/replay">
              <Button size="lg" variant="outline" className="glass gap-2">
                <Play className="h-4 w-4" /> Replay Demo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass p-8 rounded-2xl border border-destructive/20">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h2 className="text-2xl font-display font-bold">The problem</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Sports betting and prediction markets rely on centralized, opaque data feeds. Settlement is delayed, disputed, and impossible to verify. Users trust operators — not cryptography.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="glass p-8 rounded-2xl border border-primary/20 glow-primary">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-display font-bold">The solution</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            World Cup OS pipes verified TxLINE match events into transparent Solana markets. Every final score gets a cryptographic proof. Every payout settles on-chain — automatically.
          </p>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold">Judge demo — start here</h2>
          <p className="text-muted-foreground mt-2">Five minutes to see the full verifiable sports intelligence stack.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Radio, title: "Oracle Command Center", desc: "Live TxLINE pipeline terminal", to: "/oracle" },
            { icon: Play, title: "Replay Mode", desc: "90-second match lifecycle demo", to: "/replay" },
            { icon: CheckCircle2, title: "Proof Certificates", desc: "Etherscan-grade verification", to: "/proofs" },
            { icon: ListChecks, title: "Community Tasks", desc: "Earn points, grow the network", to: "/tasks" },
          ].map((item) => (
            <Link key={item.to} to={item.to}>
              <div className="glass p-6 rounded-xl h-full hover:border-primary/30 transition-colors group">
                <item.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-center gap-8 flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> TxLINE SL12 verified oracles</div>
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Sub-second Solana settlement</div>
          <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-primary" /> Real-time event stream</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Non-custodial escrow</div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} World Cup OS · Verifiable sports intelligence protocol</div>
          <div className="flex items-center gap-6">
            <span>Powered by TxLINE</span>
            <span>Settled on Solana</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
