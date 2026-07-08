import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import type { Match } from "@/lib/mock/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

export function MatchCard({ match }: { match: Match }) {
  const live = match.status === "live";
  const ht = match.status === "halftime";
  const done = match.status === "finished" || match.status === "settled";

  return (
    <Link to="/matches/$id" params={{ id: match.id }}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Card className="glass p-5 hover:border-primary/40 transition-all cursor-pointer h-full relative overflow-hidden">
          {live && (
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
          )}

          <div className="flex items-center justify-between mb-4 relative">
            <div className="flex items-center gap-2">
              {live && (
                <Badge className="bg-destructive/20 text-destructive border border-destructive/30 gap-1.5 px-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-live-dot" />
                  LIVE · {match.minute}'
                </Badge>
              )}
              {ht && <Badge className="bg-warning/20 text-warning border-warning/30">HALF-TIME</Badge>}
              {done && (
                <Badge className="bg-muted text-muted-foreground border border-border">
                  {match.status === "settled" ? "SETTLED" : "FT"}
                </Badge>
              )}
              {match.status === "scheduled" && (
                <Badge variant="outline" className="text-muted-foreground">
                  {new Date(match.kickoff).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{match.stage}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl">{match.home.flag}</span>
              <div className="min-w-0">
                <div className="font-semibold truncate">{match.home.name}</div>
                <div className="text-xs text-muted-foreground">{match.home.code}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-3xl font-display font-bold tabular-nums">
              <motion.span key={match.scoreHome} initial={{ scale: 1.4, color: "oklch(0.72 0.19 155)" }} animate={{ scale: 1, color: "currentColor" }} transition={{ duration: 0.5 }}>
                {match.scoreHome}
              </motion.span>
              <span className="text-muted-foreground text-xl">:</span>
              <motion.span key={match.scoreAway} initial={{ scale: 1.4, color: "oklch(0.72 0.19 155)" }} animate={{ scale: 1, color: "currentColor" }} transition={{ duration: 0.5 }}>
                {match.scoreAway}
              </motion.span>
            </div>

            <div className="flex items-center gap-3 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div className="font-semibold truncate">{match.away.name}</div>
                <div className="text-xs text-muted-foreground">{match.away.code}</div>
              </div>
              <span className="text-3xl">{match.away.flag}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {match.stadium}</span>
            <div className="flex gap-3 font-mono">
              <span>1 <span className="text-foreground">{match.odds.home}</span></span>
              <span>X <span className="text-foreground">{match.odds.draw}</span></span>
              <span>2 <span className="text-foreground">{match.odds.away}</span></span>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}
