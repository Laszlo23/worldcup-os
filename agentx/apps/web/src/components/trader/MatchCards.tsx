"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Brain, Sparkles } from "lucide-react";
import type { Match, Signal } from "@/lib/types";
import { getMatchFeedPhase, matchPhaseLabel } from "@/lib/match-phase";
import { GlassCard } from "./GlassCard";
import { MomentumChart } from "./MomentumChart";
import { ProbabilityBar } from "./ProbabilityBar";
import { ConfidenceRing } from "./ConfidenceRing";
import { Badge } from "@/components/ui/badge";

export function LiveMatchCard({ match, signal }: { match: Match; signal?: Signal }) {
  const wp = match.winProbability || { home: 50, draw: 25, away: 25 };
  const phase = getMatchFeedPhase(match);
  const phaseLabel = matchPhaseLabel(phase);
  const showMinute = match.status === "live" || match.status === "halftime";
  const inPlay = phase === "live" || phase === "halftime" || phase === "awaiting_feed";

  return (
    <GlassCard strong className="relative overflow-hidden space-y-0 p-0">
      <div className="pointer-events-none absolute inset-0 ambient-orbs" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <Link href={`/matches/${match.id}`} className="relative block space-y-5 p-4 pb-3 transition hover:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="max-w-[55%] truncate border-gold/20 bg-secondary/40 font-mono text-[10px] tracking-wide">
            {match.stage || "Match"}
          </Badge>
          <div className="flex items-center gap-2">
            {inPlay && (
              <Badge variant={phase === "live" ? "green" : "gold"} className="font-mono tracking-wider">
                {phase === "live" && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green animate-live-dot" />}
                {phaseLabel}
              </Badge>
            )}
            {showMinute && match.minute > 0 && (
              <span className="font-mono text-sm font-semibold tabular-nums text-green">{match.minute}&apos;</span>
            )}
          </div>
        </div>

        <div className="animate-score-rise flex items-center justify-between gap-2 text-center">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-3xl leading-none drop-shadow-sm">{match.homeTeam.flag || "⚽"}</span>
            <p className="w-full truncate font-display text-sm font-semibold tracking-tight">{match.homeTeam.name}</p>
          </div>
          <div className="shrink-0 px-2">
            <p className="font-mono text-4xl font-bold tabular-nums tracking-tight text-foreground">
              <span className="gold-text">{match.scoreHome}</span>
              <span className="mx-1.5 text-muted-foreground/50">–</span>
              <span className="gold-text">{match.scoreAway}</span>
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Score</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-3xl leading-none drop-shadow-sm">{match.awayTeam.flag || "⚽"}</span>
            <p className="w-full truncate font-display text-sm font-semibold tracking-tight">{match.awayTeam.name}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/50 bg-background/30 p-3">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="section-label">AI Momentum</span>
              <span className="font-mono font-semibold text-gold">{match.momentum.toFixed(0)}%</span>
            </div>
            <MomentumChart match={match} />
          </div>
          <div>
            <p className="section-label mb-2">Win Probability</p>
            <ProbabilityBar
              home={wp.home || 50}
              draw={wp.draw || 25}
              away={wp.away || 25}
              homeLabel={match.homeTeam.name}
              awayLabel={match.awayTeam.name}
            />
          </div>
        </div>
      </Link>

      {signal && (
        <div className="relative border-t border-gold/15 bg-gradient-to-r from-gold/[0.07] via-transparent to-purple/[0.06] p-3">
          <Link href={`/signals/${signal.id}`}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-3 rounded-xl border border-gold/25 bg-background/40 p-3"
            >
              <ConfidenceRing value={signal.confidence} size={56} />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-gold">
                  <Sparkles className="h-3 w-3" />
                  AI Recommendation
                </div>
                <p className="truncate font-display text-sm font-semibold leading-snug">{signal.headline}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{signal.prediction}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gold/70" />
            </motion.div>
          </Link>
        </div>
      )}
    </GlassCard>
  );
}

export function SignalCard({ signal }: { signal: Signal }) {
  return (
    <Link href={`/signals/${signal.id}`} className="block">
      <GlassCard className="mb-3 transition-all hover:border-gold/35 hover:shadow-[0_0_28px_oklch(0.82_0.145_88_/_0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="gold" className="font-mono tracking-wider">{signal.type.toUpperCase()}</Badge>
              <Badge variant="outline">{signal.impact} impact</Badge>
            </div>
            <p className="font-display text-[15px] font-semibold leading-snug tracking-tight">{signal.headline}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Brain className="h-3 w-3 shrink-0 text-purple" />
              <span className="truncate">
                {signal.homeTeam?.flag} {signal.homeTeam?.name} vs {signal.awayTeam?.name} {signal.awayTeam?.flag}
              </span>
            </p>
          </div>
          <ConfidenceRing value={signal.confidence} size={64} />
        </div>
      </GlassCard>
    </Link>
  );
}
