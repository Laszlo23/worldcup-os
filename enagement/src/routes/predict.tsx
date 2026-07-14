import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { PredictionCard } from "@/components/matchmind/PredictionCard";
import { UsdcPredictPanel } from "@/components/matchmind/UsdcPredictPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useEngagementPolls, usePassport } from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { prefetchMatchFeed } from "@/lib/prefetch-match";
import { Loader2 } from "lucide-react";

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
  const { match } = useActiveMatchState();
  const matchId = match?.id;
  const { data: polls = [], isPending } = useEngagementPolls(matchId ?? undefined);
  const wallet = useAppStore((s) => s.wallet);
  const { data: passportData } = usePassport(wallet.connected);
  const passport = passportData?.passport;
  const acc =
    passport && passport.predictionsTotal > 0
      ? Math.round((passport.predictionsWon / passport.predictionsTotal) * 100)
      : 0;

  return (
    <AppShell title="Predictions" subtitle="XP polls + USDC escrow markets">
      {match ? <UsdcPredictPanel match={match} /> : null}

      <Tabs defaultValue="xp" className="mt-6 px-4">
        <TabsList className="w-full">
          <TabsTrigger value="xp" className="flex-1">XP Polls</TabsTrigger>
          <TabsTrigger value="usdc" className="flex-1">USDC</TabsTrigger>
        </TabsList>
        <TabsContent value="xp" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Accuracy" value={`${acc}%`} accent />
            <Stat label="Streak" value={`${passport?.streak ?? 0}`} />
            <Stat label="Season Won" value={String(passport?.predictionsWon ?? 0)} />
          </div>
          {isPending ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            polls.map((p) => <PredictionCard key={p.id} p={p} />)
          )}
          {!isPending && polls.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Polls appear when TxLINE reports goals and live events.
            </p>
          )}
        </TabsContent>
        <TabsContent value="usdc" className="mt-4">
          <p className="text-sm text-muted-foreground">
            USDC predictions lock funds in Solana escrow. Connect your wallet and use the panel above.
          </p>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-black tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
