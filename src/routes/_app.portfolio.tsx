import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppStore } from "@/lib/store";
import { usePortfolio, useProofs } from "@/lib/queries/hooks";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Wallet, TrendingUp, Clock, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { DataSourceBadge } from "@/components/data-source-badge";
import { EscrowProofCard } from "@/components/proofs/escrow-proof-card";
import { pageTitle } from "@/lib/seo";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_app/portfolio")({
  head: () => ({ meta: [{ title: pageTitle("Portfolio") }] }),
  component: Portfolio,
});

function Portfolio() {
  const wallet = useAppStore((s) => s.wallet);
  const claim = useAppStore((s) => s.claim);
  const claimingId = useAppStore((s) => s.claimingId);
  const syncPortfolio = useAppStore((s) => s.syncPortfolio);
  const { data: portfolio, isError: portfolioError, error: portfolioFetchError } = usePortfolio();
  const qc = useQueryClient();

  useEffect(() => {
    if (portfolio) {
      syncPortfolio([...portfolio.open, ...portfolio.won, ...portfolio.lost, ...portfolio.settled]);
    }
  }, [portfolio, syncPortfolio]);

  const handleClaim = async (id: string) => {
    const result = await claim(id);
    if (result) {
      void qc.invalidateQueries({ queryKey: queryKeys.portfolio });
    }
  };

  if (!wallet.connected) {
    return <PublicPortfolio />;
  }

  const open = portfolio?.open ?? [];
  const won = portfolio?.won ?? [];
  const settled = portfolio?.settled ?? [];
  const lost = portfolio?.lost ?? [];
  const totalPredictions = open.length + won.length + settled.length + lost.length;
  const sessionExpired = portfolioError && portfolioFetchError instanceof ApiError && portfolioFetchError.status === 401;
  const inEscrow = portfolio?.inEscrow ?? 0;
  const pendingRewards = portfolio?.pendingRewards ?? 0;
  const totalEarnings = portfolio?.totalEarnings ?? 0;
  const perf = portfolio?.performance ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-display font-bold">Portfolio</h1>
          <DataSourceBadge source="on-chain" />
          <DataSourceBadge source="indexed" />
        </div>
        <p className="text-muted-foreground mt-1 font-mono text-sm">{wallet.address}</p>
      </div>

      {sessionExpired && (
        <div className="glass rounded-xl p-4 border border-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Session expired — sign in again to load your predictions.
          </p>
          <ConnectWalletButton size="sm" />
        </div>
      )}

      {!sessionExpired && totalPredictions === 0 && wallet.connected && (
        <div className="glass rounded-xl p-4 border border-border/60 text-sm text-muted-foreground">
          No predictions for this wallet yet. Your on-chain escrow proofs appear under{" "}
          <a href="/proofs" className="text-primary hover:underline">Proof Explorer</a>.
          Predictions are tied to the wallet you used when placing each bet.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative">
          <StatCard icon={Wallet} label="USDC balance" value={(portfolio?.balance ?? wallet.balance).toFixed(2)} />
          <div className="absolute top-2 right-2">
            <DataSourceBadge source="on-chain" className="scale-90 origin-top-right" />
          </div>
        </div>
        <StatCard icon={Clock} label="In escrow (indexed)" value={inEscrow.toFixed(2)} accent="warning" />
        <StatCard icon={CheckCircle2} label="Pending rewards" value={pendingRewards.toFixed(2)} accent="accent" />
        <StatCard icon={TrendingUp} label="Total earnings" value={(totalEarnings >= 0 ? "+" : "") + totalEarnings.toFixed(2)} />
      </div>

      <Card className="glass p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="font-display font-semibold">Portfolio performance</h3>
          <DataSourceBadge source="indexed" />
        </div>
        {perf.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            Performance chart appears after your first settled or lost prediction.
          </p>
        ) : (
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
        )}
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
              <Button
                size="sm"
                className="bg-gradient-primary text-primary-foreground border-0 min-w-[7.5rem]"
                disabled={claimingId === p.id}
                onClick={() => void handleClaim(p.id)}
              >
                {claimingId === p.id ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Claiming…
                  </>
                ) : (
                  <>Claim {p.payout?.toFixed(2)}</>
                )}
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

function PublicPortfolio() {
  const matches = useAppStore((s) => s.matches);
  const { data, isPending } = useProofs();
  const escrowProofs = (data?.escrowProofs ?? []).slice(0, 5);
  const getMatch = (id: string) => matches.find((m) => m.id === id);

  return (
    <div className="space-y-8">
      <div className="glass rounded-2xl p-8 md:p-10 max-w-2xl">
        <Wallet className="h-10 w-10 mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-display font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Connect your wallet to see balances, open predictions, and claim rewards. On-chain escrow proofs are public — browse them below or in{" "}
          <Link to="/proofs" className="text-primary hover:underline">Proof Explorer</Link>.
        </p>
        <ConnectWalletButton className="mt-6" />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-warning" />
          <h2 className="text-xl font-display font-semibold">Recent on-chain escrow locks</h2>
          <DataSourceBadge source="on-chain" />
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Confirmed Solana transactions from all users — visible without signing in.
        </p>
        {isPending ? (
          <div className="glass rounded-xl p-10 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {escrowProofs.map((p) => (
              <EscrowProofCard key={p.id} proof={p} match={getMatch(p.matchId)} />
            ))}
            {escrowProofs.length === 0 && (
              <p className="text-muted-foreground text-center py-10 glass rounded-xl">
                No indexed escrow transactions yet.
              </p>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm" className="glass">
            <Link to="/proofs">View all proofs</Link>
          </Button>
        </div>
      </section>
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
