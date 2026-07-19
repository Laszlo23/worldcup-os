import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { PredictionCard } from "@/components/matchmind/PredictionCard";
import { UsdcPredictPanel } from "@/components/matchmind/UsdcPredictPanel";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useEngagementPolls, usePassport } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { prefetchMatchFeed } from "@/lib/prefetch-match";
import { isMatchBettable } from "@/lib/markets";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/predict")({
  loader: async ({ context }) => {
    try {
      await prefetchMatchFeed(context.queryClient);
    } catch {
      // Client retry via queries
    }
  },
  head: () => ({
    meta: [{ title: "Predict — MatchMind AI" }],
  }),
  component: PredictScreen,
});

function PredictScreen() {
  const { match, isLoading, isError, refetch } = useActiveMatchState();
  const matchId = match?.id;
  const { data: polls = [], isPending } = useEngagementPolls(matchId ?? undefined);
  const wallet = useAppStore((s) => s.wallet);
  const { data: passportData } = usePassport(wallet.connected);
  const passport = passportData?.passport;
  const acc =
    passport && passport.predictionsTotal > 0
      ? Math.round((passport.predictionsWon / passport.predictionsTotal) * 100)
      : 0;
  const usdcOpen = match ? isMatchBettable(match) : false;

  if (isLoading) {
    return (
      <AppShell title="Predict" subtitle="XP polls + USDC markets">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </AppShell>
    );
  }

  if (isError || !match) {
    return (
      <AppShell title="Predict" subtitle="XP polls + USDC markets">
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">No active fixture loaded. Check the live match feed.</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
          <Link to="/" className="text-xs font-semibold text-accent">
            ← Back to Match
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Predict"
      subtitle={`${match.home.code} vs ${match.away.code} · ${match.status}`}
      backdropVariant="action"
    >
      <section className="px-4 pt-4">
        <div className="glass rounded-xl p-3 text-xs text-muted-foreground">
          <p className="font-display text-sm font-semibold text-foreground">Two ways to play</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <span className="font-semibold text-accent">XP Polls</span> — free live questions; win XP when you settle
              correctly
            </li>
            <li>
              <span className="font-semibold text-primary">USDC</span> — stake real escrow before kickoff only
              {usdcOpen ? " · open now" : " · closed for this live fixture"}
            </li>
          </ul>
        </div>
      </section>

      <Tabs defaultValue="xp" className="mt-4 px-4">
        <TabsList className="w-full">
          <TabsTrigger value="xp" className="flex-1">
            XP Polls
          </TabsTrigger>
          <TabsTrigger value="usdc" className="flex-1">
            USDC {usdcOpen ? "" : "(pre-match)"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="xp" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Poll accuracy" value={`${acc}%`} accent />
            <Stat label="Streak" value={`${passport?.streak ?? 0}`} />
            <Stat label="Polls won" value={String(passport?.predictionsWon ?? 0)} />
          </div>
          {!wallet.connected ? (
            <div className="glass flex flex-col items-center gap-2 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Connect to vote and track your passport stats.</p>
              <ConnectWalletButton size="default" />
            </div>
          ) : null}
          {isPending ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            polls.map((p) => <PredictionCard key={p.id} p={p} />)
          )}
          {!isPending && polls.length === 0 && (
            <div className="glass rounded-2xl px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No open XP polls right now. They appear when TxLINE reports goals and live events.
              </p>
              <Link to="/" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                Watch live match <ArrowRight className="size-3" />
              </Link>
            </div>
          )}
          <Link to="/moments" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
            Claim goal moments in Album <ArrowRight className="size-3" />
          </Link>
        </TabsContent>

        <TabsContent value="usdc" className="mt-4 space-y-4">
          <UsdcPredictPanel match={match} />
          <p className="text-center text-xs text-muted-foreground">
            During the match, switch to <span className="text-foreground">XP Polls</span> for free engagement.
          </p>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass rounded-xl px-3 py-2.5">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-black tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
