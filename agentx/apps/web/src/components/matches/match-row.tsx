"use client";

import Link from "next/link";
import { memo } from "react";
import { GlassCard } from "@/components/trader/GlassCard";
import { Badge } from "@/components/ui/badge";
import { getMatchFeedPhase, matchPhaseLabel } from "@/lib/match-phase";
import type { Match } from "@/lib/types";

function LiveScore({ scoreHome, scoreAway, minute }: { scoreHome: number; scoreAway: number; minute: number }) {
  return (
    <p className="mt-1 font-mono text-sm tabular-nums">
      <span>{scoreHome}</span>-<span>{scoreAway}</span>
      <span className="text-muted-foreground"> · </span>
      <span>{minute}&apos;</span>
    </p>
  );
}

function MatchRowInner({ match }: { match: Match }) {
  const phase = getMatchFeedPhase(match);
  const isLivePhase = phase === "live" || phase === "halftime" || phase === "awaiting_feed";

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <GlassCard className="mb-3 transition-colors hover:border-gold/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">{match.homeTeam.flag}</span>
            <div>
              <p className="text-sm font-medium">
                {match.homeTeam.name} vs {match.awayTeam.name}
              </p>
              <p className="text-xs text-muted-foreground">{match.stage}</p>
              {match.externalId && !match.externalId.startsWith("demo-") ? (
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-green">
                  TxLINE · {match.externalId}
                </p>
              ) : null}
            </div>
            <span className="text-lg">{match.awayTeam.flag}</span>
          </div>
          <div className="text-right">
            {isLivePhase ? (
              <>
                <Badge variant={phase === "live" ? "green" : "outline"}>{matchPhaseLabel(phase)}</Badge>
                {(phase === "live" || phase === "halftime") && (
                  <LiveScore scoreHome={match.scoreHome} scoreAway={match.scoreAway} minute={match.minute} />
                )}
              </>
            ) : phase === "predictable" || phase === "closing_soon" || phase === "locked" ? (
              <Badge variant="outline">{matchPhaseLabel(phase)}</Badge>
            ) : (
              <p className="font-mono text-sm tabular-nums">
                {match.scoreHome}-{match.scoreAway}
              </p>
            )}
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}

function matchRowPropsEqual(prev: { match: Match }, next: { match: Match }) {
  const a = prev.match;
  const b = next.match;
  return (
    a.id === b.id &&
    a.scoreHome === b.scoreHome &&
    a.scoreAway === b.scoreAway &&
    a.minute === b.minute &&
    a.status === b.status &&
    a.stage === b.stage
  );
}

export const MatchRow = memo(MatchRowInner, matchRowPropsEqual);
