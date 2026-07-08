import { ScrollArea } from "@/components/ui/scroll-area";
import type { LiveEvent } from "@/lib/queries/hooks";
import { Radio, TrendingUp, ShieldCheck, Zap, CircleDot } from "lucide-react";

const ICONS: Record<string, typeof Radio> = {
  goal: CircleDot,
  odds_update: TrendingUp,
  market_close: Zap,
  settlement: ShieldCheck,
  proof_verified: ShieldCheck,
};

function eventIcon(type: string) {
  const Icon = ICONS[type] ?? Radio;
  return <Icon className="h-3.5 w-3.5" />;
}

function eventColor(type: string) {
  switch (type) {
    case "goal":
      return "text-destructive";
    case "odds_update":
      return "text-accent";
    case "settlement":
    case "proof_verified":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

export function EventTimeline({ events }: { events: LiveEvent[] }) {
  return (
    <ScrollArea className="h-[calc(100vh-14rem)] pr-3">
      <div className="space-y-1 font-mono text-xs">
        {events.map((e) => (
          <div key={e.id} className="flex gap-3 py-2 border-b border-border/50 hover:bg-muted/30 px-2 rounded transition-colors">
            <span className="text-muted-foreground shrink-0 w-16">
              {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className={`shrink-0 ${eventColor(e.event_type)}`}>{eventIcon(e.event_type)}</span>
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate">{e.title}</div>
              <div className="text-muted-foreground truncate">{e.body}</div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">Waiting for TxLINE events…</div>
        )}
      </div>
    </ScrollArea>
  );
}
