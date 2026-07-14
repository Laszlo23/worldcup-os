import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import type { Match } from "@/lib/mock/types";
import { hasRealOdds } from "@/lib/data-truth";
import { getMatchFeedPhase } from "@/lib/match-phase";
import { Badge } from "@/components/ui/badge";
import { KickoffCountdown } from "@/components/kickoff-countdown";
import { MapPin, Radio, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

import { formatKickoffTime } from "@/lib/format-time";

export function MatchCard({ match }: { match: Match }) {
  const odds = hasRealOdds(match.odds) ? match.odds : null;
  const phase = getMatchFeedPhase(match);
  const live = phase === "live";
  const ht = phase === "halftime";
  const awaiting = phase === "awaiting_feed";
  const done = phase === "finished";
  const predictable = phase === "predictable" || phase === "closing_soon";
  const locked = phase === "locked";
  const verified = Boolean(match.hasVerifiedProof);
  const settlementReady = done && verified;

  const oddsDelta =
    odds && match.oddsHistory.length >= 2
      ? match.oddsHistory[match.oddsHistory.length - 1].home - match.oddsHistory[0].home
      : 0;
  const oddsTrend = oddsDelta < 0 ? "down" : oddsDelta > 0 ? "up" : "flat";

  return (
    <Link to="/matches/$id" params={{ id: match.id }} hash="predict" className="block min-w-0">
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="h-full min-w-0"
      >
        <article className="broadcast-card @container rounded-xl p-4 sm:p-5 cursor-pointer h-full relative overflow-hidden group hover:border-primary/30 transition-colors duration-300 min-w-0">
          {(live || awaiting) && (
            <>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/15 transition-colors" />
            </>
          )}

          {/* Header: stage + kickoff on one row — status badge below (no overlap) */}
          <div className="mb-4 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate min-w-0">
                {match.stage}
              </span>
              {(predictable || locked || awaiting) && (
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap shrink-0">
                  {awaiting ? (
                    <KickoffCountdown kickoff={match.kickoff} mode="elapsed" />
                  ) : (
                    formatKickoffTime(match.kickoff)
                  )}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {live && (
                <Badge className="bg-destructive/15 text-destructive border border-destructive/40 gap-1.5 px-2.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-live-dot" />
                  Live {match.minute}&apos;
                </Badge>
              )}
              {ht && (
                <Badge className="bg-warning/15 text-warning border-warning/30 font-mono text-[10px] uppercase whitespace-nowrap">
                  Half-time
                </Badge>
              )}
              {done && (
                <Badge className="bg-muted/50 text-muted-foreground border border-border font-mono text-[10px] uppercase whitespace-nowrap">
                  {match.status === "settled" ? "Settled" : "Full time"}
                </Badge>
              )}
              {awaiting && (
                <Badge className="bg-warning/15 text-warning border-warning/40 gap-1.5 px-2.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap">
                  <Radio className="h-3 w-3" />
                  Awaiting feed
                </Badge>
              )}
              {predictable && (
                <Badge className="bg-primary/15 text-primary border-primary/30 font-mono text-[10px] uppercase whitespace-nowrap shrink-0">
                  Predict
                </Badge>
              )}
              {locked && (
                <Badge className="bg-muted/50 text-muted-foreground border border-border font-mono text-[10px] uppercase whitespace-nowrap shrink-0">
                  Locked
                </Badge>
              )}
              {phase === "closing_soon" && (
                <Badge className="bg-accent/15 text-accent border-accent/30 font-mono text-[10px] uppercase whitespace-nowrap shrink-0">
                  Closing soon
                </Badge>
              )}
            </div>
            {(predictable || locked || phase === "closing_soon") && (
              <KickoffCountdown kickoff={match.kickoff} mode="countdown" variant="banner" className="w-full" />
            )}
            {awaiting && (
              <KickoffCountdown kickoff={match.kickoff} mode="elapsed" variant="banner" className="w-full" />
            )}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 @sm:gap-3 mb-4">
            <div className="flex flex-col items-center gap-1 min-w-0 @sm:items-start">
              <span className="text-2xl @sm:text-3xl leading-none">{match.home.flag}</span>
              <div className="text-center @sm:text-left min-w-0 w-full">
                <div className="font-display font-semibold text-xs @sm:text-sm truncate">{match.home.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{match.home.code}</div>
              </div>
            </div>

            <div className="flex flex-col items-center px-1 @sm:px-2 shrink-0">
              <div className="flex items-center gap-1.5 @sm:gap-2 text-3xl @sm:text-4xl font-display font-bold tabular-nums tracking-tighter">
                <motion.span
                  key={match.scoreHome}
                  initial={{ scale: 1.3, color: "oklch(0.78 0.2 155)" }}
                  animate={{ scale: 1, color: "currentColor" }}
                  transition={{ duration: 0.5 }}
                >
                  {match.scoreHome}
                </motion.span>
                <span className="text-muted-foreground/50 text-xl @sm:text-2xl font-light">—</span>
                <motion.span
                  key={match.scoreAway}
                  initial={{ scale: 1.3, color: "oklch(0.78 0.2 155)" }}
                  animate={{ scale: 1, color: "currentColor" }}
                  transition={{ duration: 0.5 }}
                >
                  {match.scoreAway}
                </motion.span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 min-w-0 @sm:items-end">
              <span className="text-2xl @sm:text-3xl leading-none">{match.away.flag}</span>
              <div className="text-center @sm:text-right min-w-0 w-full">
                <div className="font-display font-semibold text-xs @sm:text-sm truncate">{match.away.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{match.away.code}</div>
              </div>
            </div>
          </div>

          {match.stadium ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3 font-mono min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{match.stadium}</span>
            </div>
          ) : null}

          <div className="border-t border-border/60 pt-3 space-y-2">
            {odds ? (
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <OddsCell label="1" value={odds.home.toFixed(2)} />
                <OddsCell label="X" value={odds.draw.toFixed(2)} />
                <OddsCell label="2" value={odds.away.toFixed(2)} />
              </div>
            ) : (
              <p className="text-[11px] font-mono text-muted-foreground">Odds pending from TxLINE</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 min-h-[1.25rem]">
              {odds && oddsTrend !== "flat" ? (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] font-mono",
                    oddsTrend === "down" ? "text-primary" : "text-warning",
                  )}
                >
                  <TrendingUp className={cn("h-3 w-3", oddsTrend === "down" && "rotate-180")} />
                  {Math.abs(oddsDelta).toFixed(2)}
                </span>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2 ml-auto">
                {verified && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-primary whitespace-nowrap">
                    <ShieldCheck className="h-3 w-3 shrink-0" /> Proof
                  </span>
                )}
                {settlementReady && (
                  <span className="text-[10px] font-mono text-accent uppercase tracking-wider whitespace-nowrap">
                    Settlement ready
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      </motion.div>
    </Link>
  );
}

function OddsCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/20 px-2 py-1.5 text-center min-w-0">
      <span className="text-muted-foreground">{label} </span>
      <span className="text-foreground font-semibold tabular-nums">{value}</span>
    </div>
  );
}





