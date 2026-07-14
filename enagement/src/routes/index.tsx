import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/matchmind/AppShell";
import { PredictionCard } from "@/components/matchmind/PredictionCard";
import { MomentCard } from "@/components/matchmind/MomentCard";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useEngagementPolls, useEngagementMoments, useLiveEvents } from "@/lib/queries/hooks";
import { prefetchMatchFeed } from "@/lib/prefetch-match";
import { Button } from "@/components/ui/button";
import { MatchLoadingSkeleton } from "@/components/matchmind/MatchLoadingSkeleton";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    try {
      await prefetchMatchFeed(context.queryClient);
    } catch {
      // Client can retry; avoid SSR hard-fail when API is briefly unavailable.
    }
  },
  component: MatchScreen,
});

function MatchScreen() {
  const { match, isLoading, isError, refetch } = useActiveMatchState();
  const matchId = match?.id;
  const { data: polls = [], isPending: pollsLoading } = useEngagementPolls(matchId ?? undefined);
  const { data: moments = [] } = useEngagementMoments(matchId ?? undefined);
  const { data: events = [] } = useLiveEvents(matchId ?? undefined);

  if (isLoading) {
    return (
      <AppShell title="Live Match" subtitle="TxLINE feed">
        <MatchLoadingSkeleton />
      </AppShell>
    );
  }

  if (isError || !match) {
    return (
      <AppShell title="Live Match" subtitle="TxLINE feed">
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load the live fixture. Check your connection and try again.
          </p>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      </AppShell>
    );
  }

  const momentumPct = match.stats?.possession?.[0] ?? 50;
  const featured = polls[0];
  const featuredMoment = moments[0];

  return (
    <AppShell title="Live Match" subtitle={`${match.stage} · ${match.stadium}`}>
      <section className="px-4 pt-5">
        <div>
          <div className="flex items-center justify-center gap-2">
            <span className="size-1.5 rounded-full bg-live mm-live-dot" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-live">
              {match.status === "live" ? `Live · ${match.minute}'` : match.status.toUpperCase()}
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <TeamBadge code={match.home.code} name={match.home.name} align="left" />
            <div className="flex flex-col items-center px-2">
              <div className="mt-1 flex items-baseline gap-2 text-6xl font-black italic tracking-tighter tabular-nums text-glow-primary">
                <span>{match.scoreHome}</span>
                <span className="text-muted-foreground/60">—</span>
                <span>{match.scoreAway}</span>
              </div>
            </div>
            <TeamBadge code={match.away.code} name={match.away.name} align="right" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="relative h-6 overflow-hidden rounded-md border border-border bg-card p-1">
              <motion.div
                initial={false}
                animate={{ width: `${momentumPct}%` }}
                className="h-full rounded-sm bg-primary mm-pulse-glow"
              />
            </div>
            <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <span>xG {match.stats?.xg?.[0]?.toFixed(1) ?? "—"}</span>
              <span>Possession {match.stats?.possession?.[0] ?? "—"}%</span>
              <span>xG {match.stats?.xg?.[1]?.toFixed(1) ?? "—"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 px-4">
        <SectionLabel>TxLINE Feed</SectionLabel>
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
          {events.slice(0, 6).map((e) => (
            <div key={e.id} className="flex gap-3 rounded-xl border-l-2 border-accent bg-accent/5 p-3 text-sm">
              <Sparkles className="size-3.5 text-accent shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-[9px] uppercase text-accent">{e.title}</div>
                <p className="text-[13px] text-foreground/90">{e.body}</p>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">Awaiting TxLINE events for this fixture.</p>
          )}
        </div>
      </section>

      {featured ? (
        <section className="mt-6 px-4">
          <SectionLabel>Featured prediction</SectionLabel>
          <div className="mt-2">
            <PredictionCard p={featured} />
          </div>
        </section>
      ) : pollsLoading ? null : (
        <p className="mt-6 px-4 text-sm text-muted-foreground">New XP polls unlock on the next TxLINE goal or event.</p>
      )}

      {featuredMoment ? (
        <section className="mt-8 px-4">
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Latest sticker drop</SectionLabel>
            <Link to="/moments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Album <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <MomentCard moment={featuredMoment} />
          {!featuredMoment.claimed ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Claim on Solana to add this goal sticker to your album.
            </p>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}

function TeamBadge({ code, name, align }: { code: string; name: string; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start"}`}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{code}</span>
      <span className="mt-1 max-w-[5.5rem] text-sm font-semibold leading-tight">{name}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{children}</p>
  );
}
