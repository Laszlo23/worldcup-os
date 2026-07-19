import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, Sparkles, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/matchmind/AppShell";
import { LiveMatchVideo } from "@/components/matchmind/LiveMatchVideo";
import { PredictionCard } from "@/components/matchmind/PredictionCard";
import { MomentCard } from "@/components/matchmind/MomentCard";
import { BallNewsSection } from "@/components/matchmind/BallNews";
import { TeamFlag } from "@/components/matchmind/TeamFlag";
import { UsdcPredictPanel } from "@/components/matchmind/UsdcPredictPanel";
import { useActiveMatchState } from "@/lib/use-active-match";
import {
  useCommunity,
  useEngagementPolls,
  useEngagementMoments,
  useLiveEvents,
} from "@/lib/queries/hooks";
import { prefetchMatchFeed } from "@/lib/prefetch-match";
import { Button } from "@/components/ui/button";
import { MatchLoadingSkeleton } from "@/components/matchmind/MatchLoadingSkeleton";
import { unlockFanBadge } from "@/lib/onboarding";
import { buildBallNews } from "@/lib/ball-news";
import { editorialAsNewsItems } from "@/lib/blog-posts";
import { isSpainArgentinaFinal } from "@/lib/team-flags";
import { isMatchBettable } from "@/lib/markets";

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
  const { data: community } = useCommunity(matchId ?? undefined);

  const news = useMemo(() => {
    const editorial = editorialAsNewsItems();
    const wire = match ? buildBallNews(match, events) : [];
    // Features first for SEO/readability; live wires fill the rest.
    return [...editorial.slice(0, 3), ...wire].slice(0, 5);
  }, [match, events]);

  // Must run before any early return — SSR/client loading branches previously
  // changed hook count and crashed the first visit until reload.
  const isLive = match?.status === "live" || match?.status === "halftime";
  const [playMode, setPlayMode] = useState<"xp" | "funds">("xp");
  useEffect(() => {
    if (isLive) unlockFanBadge("pulse-junkie");
  }, [isLive]);

  if (isLoading) {
    return (
      <AppShell title="Live Hub" subtitle="Fan feed">
        <MatchLoadingSkeleton />
      </AppShell>
    );
  }

  if (isError || !match) {
    return (
      <AppShell title="Live Hub" subtitle="Fan feed">
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
  const openPolls = polls.filter((p) => !p.resolved).slice(0, 2);
  const featuredMoment = moments[0];
  const finals = isSpainArgentinaFinal(match.home.code, match.away.code);
  const usdcOpen = isMatchBettable(match);

  return (
    <AppShell
      title="Live Hub"
      subtitle={
        finals
          ? "World Cup Final · Spain vs Argentina"
          : `${match.stage}${match.stadium ? ` · ${match.stadium}` : ""}`
      }
      backdropVariant="crowd"
      backdropIntensity="hero"
    >
      <section className="px-4 pt-5">
        <LiveMatchVideo
          homeCode={match.home.code}
          awayCode={match.away.code}
          homeFlag={match.home.flag}
          awayFlag={match.away.flag}
          live={isLive}
          minute={match.minute}
          finals={finals}
        />

        <div className="glass-strong relative mt-3 overflow-hidden rounded-3xl p-5 mm-float-in">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {finals ? (
              <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                Finals
              </span>
            ) : null}
            <span className="size-1.5 rounded-full bg-live mm-live-dot" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-live">
              {match.status === "live" ? `Live · ${match.minute}'` : match.status.toUpperCase()}
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <TeamFlag code={match.home.code} name={match.home.name} flag={match.home.flag} size="lg" />
            <div className="flex flex-col items-center px-2">
              <div className="flex items-baseline gap-2.5 font-display text-6xl font-bold italic tracking-tighter tabular-nums text-glow-primary">
                <span>{match.scoreHome}</span>
                <span className="text-2xl text-muted-foreground/50">–</span>
                <span>{match.scoreAway}</span>
              </div>
              {finals ? (
                <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
                  World Cup Final
                </p>
              ) : null}
            </div>
            <TeamFlag
              code={match.away.code}
              name={match.away.name}
              flag={match.away.flag}
              align="right"
              size="lg"
            />
          </div>
          <div className="mt-5 space-y-2">
            <div className="relative h-2 overflow-hidden rounded-full bg-background/80">
              <motion.div
                initial={false}
                animate={{ width: `${momentumPct}%` }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <span>xG {match.stats?.xg?.[0]?.toFixed(1) ?? "—"}</span>
              <span>{match.stats?.possession?.[0] ?? "—"}% poss</span>
              <span>xG {match.stats?.xg?.[1]?.toFixed(1) ?? "—"}</span>
            </div>
          </div>
        </div>

        <Link
          to="/community"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/40 px-3.5 py-3 transition hover:border-primary/40"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Users className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Crew</p>
              <p className="truncate text-sm font-semibold">
                {(community?.crowd.checkedIn ?? 0) > 0
                  ? `${community?.crowd.checkedIn} checked in`
                  : "Join the terrace chat"}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </section>

      <section className="mt-7 px-4">
        <BallNewsSection items={news} limit={4} />
      </section>

      <section className="mt-7 px-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <SectionLabel>Predict this window</SectionLabel>
          <Link to="/predict" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
            Full desk <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-background/50 p-1">
          <button
            type="button"
            onClick={() => setPlayMode("xp")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
              playMode === "xp" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Sparkles className="size-3.5" />
            XP only
          </button>
          <button
            type="button"
            onClick={() => setPlayMode("funds")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
              playMode === "funds" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            <Wallet className="size-3.5" />
            Real funds
          </button>
        </div>

        {playMode === "xp" ? (
          openPolls.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Free XP polls — locked on-chain via your MatchMind wallet (unlock once).
              </p>
              {openPolls.map((poll) => (
                <PredictionCard key={poll.id} p={poll} />
              ))}
            </div>
          ) : pollsLoading ? null : (
            <div className="rounded-2xl border border-border/70 bg-card/40 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                7-minute XP polls open while the match is live.
              </p>
              <Link to="/predict" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                Predict tab <ArrowRight className="size-3" />
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {usdcOpen
                ? "Stake USDC from your MatchMind wallet — unlock once, then confirm the lock."
                : "USDC escrow is pre-kickoff only. Switch back to XP for live windows."}
            </p>
            <UsdcPredictPanel match={match} />
          </div>
        )}

        <Link
          to="/passport"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3 transition hover:border-primary/45"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Wallet className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                MatchMind wallet
              </p>
              <p className="truncate text-sm font-semibold">Profile · socials · Human Passport</p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </section>

      {featuredMoment ? (
        <section className="mt-7 px-4 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Latest drop</SectionLabel>
            <Link to="/moments" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
              Album <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <MomentCard moment={featuredMoment} />
        </section>
      ) : null}

      <section className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 pb-6 text-xs font-semibold">
        <Link to="/legends" className="text-accent">
          Legends →
        </Link>
        <Link to="/market" className="text-accent">
          Market →
        </Link>
        <Link to="/wishes" className="text-accent">
          Wishes →
        </Link>
        <Link to="/news" className="text-muted-foreground hover:text-accent">
          Ball News
        </Link>
        <Link to="/tasks" className="text-muted-foreground hover:text-accent">
          Tasks
        </Link>
        <Link to="/faq" className="text-muted-foreground hover:text-accent">
          FAQ
        </Link>
      </section>
    </AppShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{children}</p>
  );
}
