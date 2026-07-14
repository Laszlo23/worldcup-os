"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { Badge } from "@/components/ui/badge";
import { LivePredictionCard } from "@/components/matches/live-prediction-card";
import { getMatchFeedPhase, isLiveBettableMatch, matchPhaseLabel } from "@/lib/match-phase";

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;

  const { data: matchData } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => api.match(matchId),
    placeholderData: (prev) => prev,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const { data: marketsData } = useQuery({
    queryKey: ["match-markets", matchId],
    queryFn: () => api.matchLiveMarkets(matchId),
    enabled: Boolean(matchData?.match && isLiveBettableMatch(matchData.match)),
    refetchInterval: 10_000,
    placeholderData: (prev) => prev,
  });

  const match = matchData?.match;
  if (!match) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading match…</p>
      </AppShell>
    );
  }

  const phase = getMatchFeedPhase(match);
  const liveMarkets = marketsData?.markets ?? [];

  return (
    <AppShell>
      <Link href="/matches" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      <div className="mb-6 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold">
              {match.homeTeam.flag} {match.homeTeam.name} vs {match.awayTeam.name} {match.awayTeam.flag}
            </p>
            <p className="text-sm text-muted-foreground">{match.stage}</p>
          </div>
          <Badge variant={phase === "live" ? "green" : "outline"}>{matchPhaseLabel(phase)}</Badge>
        </div>
        {(phase === "live" || phase === "halftime") && (
          <p className="mt-3 font-mono text-2xl font-bold tabular-nums">
            {match.scoreHome} - {match.scoreAway}
            <span className="ml-2 text-base font-normal text-muted-foreground">{match.minute}&apos;</span>
          </p>
        )}
      </div>

      {isLiveBettableMatch(match) ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">Live predictions</h2>
          {liveMarkets.length ? (
            <div className="space-y-3">
              {liveMarkets.map((m) => (
                <LivePredictionCard key={m.externalId} market={m} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Spinning up live markets…</p>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Live USDC predictions open when the match goes live.
        </p>
      )}
    </AppShell>
  );
}
