"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Brain } from "lucide-react";
import type { Match, Signal } from "@/lib/types";
import { GlassCard } from "./GlassCard";
import { MomentumChart } from "./MomentumChart";
import { ProbabilityBar } from "./ProbabilityBar";
import { ConfidenceRing } from "./ConfidenceRing";
import { Badge } from "@/components/ui/badge";

export function LiveMatchCard({ match, signal }: { match: Match; signal?: Signal }) {
  const wp = match.winProbability || { home: 50, draw: 25, away: 25 };
  return (
    <GlassCard className="purple-glow space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="purple">{match.stage}</Badge>
        {match.status === "live" && (
          <span className="text-sm font-mono text-green">{match.minute}&apos;</span>
        )}
      </div>
      <div className="flex items-center justify-between text-center">
        <div className="flex-1">
          <p className="text-2xl">{match.homeTeam.flag}</p>
          <p className="text-sm font-medium">{match.homeTeam.name}</p>
        </div>
        <div className="px-4">
          <p className="text-3xl font-bold font-mono">
            {match.scoreHome} - {match.scoreAway}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-2xl">{match.awayTeam.flag}</p>
          <p className="text-sm font-medium">{match.awayTeam.name}</p>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>AI Momentum</span>
          <span className="font-mono text-gold">{match.momentum.toFixed(0)}%</span>
        </div>
        <MomentumChart match={match} />
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Win Probability</p>
        <ProbabilityBar home={wp.home || 50} draw={wp.draw || 25} away={wp.away || 25} homeLabel={match.homeTeam.name} awayLabel={match.awayTeam.name} />
      </div>
      {signal && (
        <Link href={`/signals/${signal.id}`}>
          <motion.div whileHover={{ scale: 1.01 }} className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 p-3">
            <ConfidenceRing value={signal.confidence} size={56} />
            <div className="flex-1">
              <div className="flex items-center gap-1 text-xs text-purple">
                <Brain className="h-3 w-3" /> AI Prediction
              </div>
              <p className="text-sm font-medium">{signal.headline}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </Link>
      )}
    </GlassCard>
  );
}

export function SignalCard({ signal }: { signal: Signal }) {
  return (
    <Link href={`/signals/${signal.id}`}>
      <GlassCard className="mb-3 hover:border-gold/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Badge variant="gold">{signal.type.toUpperCase()}</Badge>
              <Badge variant="outline">{signal.impact} impact</Badge>
            </div>
            <p className="font-medium">{signal.headline}</p>
            <p className="text-xs text-muted-foreground">
              {signal.homeTeam?.flag} {signal.homeTeam?.name} vs {signal.awayTeam?.name} {signal.awayTeam?.flag}
            </p>
          </div>
          <ConfidenceRing value={signal.confidence} size={64} />
        </div>
      </GlassCard>
    </Link>
  );
}
