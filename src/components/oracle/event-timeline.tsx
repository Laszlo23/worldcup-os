import { ScrollArea } from "@/components/ui/scroll-area";
import type { LiveEvent } from "@/lib/queries/hooks";
import { Radio, TrendingUp, ShieldCheck, Zap, CircleDot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ICONS: Record<string, typeof Radio> = {
  goal: CircleDot,
  odds_update: TrendingUp,
  market_close: Zap,
  market_closing: Zap,
  settlement: ShieldCheck,
  settlement_started: ShieldCheck,
  settlement_finished: ShieldCheck,
  proof_verified: ShieldCheck,
  tx_confirmed: ShieldCheck,
  kickoff_waiting: Radio,
};

function eventIcon(type: string) {
  const Icon = ICONS[type] ?? Radio;
  return <Icon className="h-3.5 w-3.5" />;
}

function eventBorder(type: string) {
  switch (type) {
    case "goal":
      return "border-destructive/50";
    case "odds_update":
      return "border-accent/50";
    case "settlement":
    case "settlement_started":
    case "settlement_finished":
    case "proof_verified":
    case "tx_confirmed":
      return "border-primary/50";
    default:
      return "border-border";
  }
}

export function EventTimeline({ events }: { events: LiveEvent[] }) {
  return (
    <ScrollArea className="h-[calc(100vh-14rem)] sm:h-[calc(100vh-14rem)] min-h-[240px] pr-3">
      <div className="space-y-2 font-mono text-xs">
        <AnimatePresence mode="popLayout">
          {events.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className={`flex gap-3 py-2.5 border-l-2 pl-3 hover:bg-muted/20 rounded-r transition-colors ${eventBorder(e.event_type)}`}
            >
              <span className="text-muted-foreground shrink-0 w-[4.5rem] tabular-nums text-[10px]">
                {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="shrink-0 opacity-80">{eventIcon(e.event_type)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-foreground font-medium truncate text-sm">{e.title}</div>
                <div className="text-muted-foreground truncate text-[11px] mt-0.5">{e.body}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <div className="text-muted-foreground py-12 text-center font-mono text-[11px] uppercase tracking-widest">
            <span className="animate-live-dot inline-block h-2 w-2 rounded-full bg-primary mr-2" />
            Awaiting TxLINE events…
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
