import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { usePortfolio } from "@/lib/queries/hooks";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { ConnectWalletButton } from "@/components/connect-wallet";

export const Route = createFileRoute("/_app/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — World Cup OS" }] }),
  component: Portfolio,
});

function Portfolio() {
  const wallet = useAppStore((s) => s.wallet);
  const claim = useAppStore((s) => s.claim);
  const syncPortfolio = useAppStore((s) => s.syncPortfolio);
  const { data: portfolio } = usePortfolio();

  useEffect(() => {
    if (portfolio) {
      syncPortfolio([...portfolio.open, ...portfolio.won, ...portfolio.lost, ...portfolio.settled]);
    }
  }, [portfolio, syncPortfolio]);

  if (!wallet.connected) {
    return (
      <div className="glass rounded-2xl p-16 text-center max-w-md mx-auto">
        <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-display font-semibold mb-2">Connect your wallet</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in with your Solana wallet to view your portfolio.</p>
        <ConnectWalletButton />
      </div>
    );
  }

  const open = portfolio?.open ?? [];
  const won = portfolio?.won ?? [];
  const settled = portfolio?.settled ?? [];
  const lost = portfolio?.lost ?? [];
  const inEscrow = portfolio?.inEscrow ?? 0;
  const pendingRewards = portfolio?.pendingRewards ?? 0;
  const totalEarnings = portfolio?.totalEarnings ?? 0;
  const perf = portfolio?.performance ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Portfolio</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">{wallet.address}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="USDC balance" value={(portfolio?.balance ?? wallet.balance).toFixed(2)} />
        <StatCard icon={Clock} label="In escrow" value={inEscrow.toFixed(2)} accent="warning" />
        <StatCard icon={CheckCircle2} label="Pending rewards" value={pendingRewards.toFixed(2)} accent="accent" />
        <StatCard icon={TrendingUp} label="Total earnings" value={(totalEarnings >= 0 ? "+" : "") + totalEarnings.toFixed(2)} />
      </div>

      <Card className="glass p-6">
        <h3 className="font-display font-semibold mb-4">Portfolio performance</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={perf}>
              <defs>
                <linearGradient id="pp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
              <XAxis dataKey="d" stroke="oklch(0.68 0.02 260)" fontSize={11} />
              <YAxis stroke="oklch(0.68 0.02 260)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }} />
              <Area dataKey="v" stroke="oklch(0.72 0.19 155)" fill="url(#pp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Open predictions">
          {open.length === 0 && <Empty text="No open predictions. Head to Markets to place one." />}
          {open.map((p) => <PredictionRow key={p.id} p={p} />)}
        </Section>

        <Section title="Pending rewards">
          {won.length === 0 && <Empty text="No unclaimed rewards." />}
          {won.map((p) => (
            <PredictionRow key={p.id} p={p} actions={
              <Button size="sm" className="bg-gradient-primary text-primary-foreground border-0" onClick={() => void claim(p.id)}>
                Claim {p.payout?.toFixed(2)}
              </Button>
            } />
          ))}
        </Section>

        <Section title="Claim history">
          {settled.length === 0 && <Empty text="No claims yet." />}
          {settled.map((p) => <PredictionRow key={p.id} p={p} />)}
        </Section>

        <Section title="Lost predictions">
          {lost.length === 0 && <Empty text="No lost predictions." />}
          {lost.map((p) => <PredictionRow key={p.id} p={p} />)}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="glass p-5">
      <h3 className="font-display font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground text-center py-6">{text}</div>;
}

function PredictionRow({ p, actions }: { p: import("@/lib/mock/types").Prediction; actions?: React.ReactNode }) {
  const colors: Record<string, string> = {
    open: "bg-warning/20 text-warning border-warning/30",
    won: "bg-primary/20 text-primary border-primary/30",
    lost: "bg-destructive/20 text-destructive border-destructive/30",
    settled: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate font-medium">{p.outcomeLabel}</div>
        <div className="text-xs text-muted-foreground">
          {p.amount} USDC @ {p.price.toFixed(2)}x · payout {(p.amount * p.price).toFixed(2)}
        </div>
      </div>
      <Badge className={colors[p.status]}>{p.status.toUpperCase()}</Badge>
      {actions}
    </div>
  );
}
