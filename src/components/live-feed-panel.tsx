import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Radio, X } from "lucide-react";
import { useOracleFeed } from "@/lib/queries/hooks";
import { normalizeLiveEvents } from "@/lib/live-events";
import { mergeFeedItems } from "@/lib/feed-items";
import { LiveEventList } from "@/components/live-event-list";
import { ChatComposer } from "@/components/chat-composer";
import { DataSourceBadge } from "@/components/data-source-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const RAIL_STORAGE_KEY = "wmos-live-feed-open";

type LiveFeedPanelProps = {
  mode: "rail" | "sheet";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function LiveFeedPanel({ mode, open, onOpenChange }: LiveFeedPanelProps) {
  const walletAddress = useAppStore((s) => s.wallet.address);
  const { events, chatMessages, connected, latencyMs, isLoading } = useOracleFeed(3_000);
  const normalized = normalizeLiveEvents(events);
  const items = useMemo(() => mergeFeedItems(normalized, chatMessages), [normalized, chatMessages]);

  if (mode === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] glass border-t border-border/60 p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/40 shrink-0">
            <SheetTitle className="flex items-center justify-between gap-2 font-display">
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" /> 0xODDS Feed
              </span>
              <FeedStatus connected={connected} latencyMs={latencyMs} />
            </SheetTitle>
            <div className="flex flex-wrap gap-1.5 pt-2">
              <DataSourceBadge source="txline" />
              <DataSourceBadge source="indexed" label="Community" />
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden px-4 py-3">
            <FeedBody items={items} loading={isLoading} autoScroll currentWallet={walletAddress} />
          </div>
          <ChatComposer />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <LiveFeedRail
      items={items}
      connected={connected}
      latencyMs={latencyMs}
      loading={isLoading}
      currentWallet={walletAddress}
    />
  );
}

function LiveFeedRail({
  items,
  connected,
  latencyMs,
  loading,
  currentWallet,
}: {
  items: ReturnType<typeof mergeFeedItems>;
  connected: boolean;
  latencyMs: number;
  loading: boolean;
  currentWallet: string;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(RAIL_STORAGE_KEY);
    if (stored === "false") setOpen(false);
  }, []);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      localStorage.setItem(RAIL_STORAGE_KEY, String(next));
      return next;
    });
  };

  if (!open) {
    return (
      <aside className="hidden xl:flex w-10 shrink-0 border-l border-border/40 bg-black/20 flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Open live feed">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl] mt-4">
          Live
        </span>
      </aside>
    );
  }

  return (
    <aside className="hidden xl:flex w-80 shrink-0 border-l border-border/40 bg-black/20 flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="h-4 w-4 text-primary shrink-0" />
          <span className="font-display font-semibold text-sm truncate">0xODDS Feed</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <FeedStatus connected={connected} latencyMs={latencyMs} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggle} aria-label="Collapse live feed">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="px-4 py-2 border-b border-border/30 shrink-0 flex flex-wrap gap-1.5">
        <DataSourceBadge source="txline" />
        <DataSourceBadge source="indexed" label="Community" />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-4 pb-0">
        <FeedBody items={items} loading={loading} autoScroll currentWallet={currentWallet} />
      </div>
      <ChatComposer />
    </aside>
  );
}

function FeedStatus({ connected, latencyMs }: { connected: boolean; latencyMs: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider",
        connected ? "text-primary" : "text-warning",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-primary animate-live-dot" : "bg-warning")} />
      {connected ? `${latencyMs}ms` : "offline"}
    </span>
  );
}

function FeedBody({
  items,
  loading,
  autoScroll,
  currentWallet,
}: {
  items: ReturnType<typeof mergeFeedItems>;
  loading: boolean;
  autoScroll?: boolean;
  currentWallet?: string;
}) {
  if (loading && !items.length) {
    return <div className="text-sm text-muted-foreground text-center py-8">Connecting to live feed…</div>;
  }
  if (!items.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No events yet. TxLINE goals and settlements appear here once — community chat below.
      </div>
    );
  }
  return <LiveEventList items={items} variant="chat" autoScroll={autoScroll} currentWallet={currentWallet} />;
}

export function LiveFeedMobileTrigger({ onClick, newCount }: { onClick: () => void; newCount?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="xl:hidden fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground shadow-lg px-4 py-2.5 text-xs font-mono uppercase tracking-wider"
    >
      <Radio className="h-4 w-4" />
      Live
      {newCount != null && newCount > 0 && (
        <span className="bg-destructive text-destructive-foreground rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-[10px]">
          {newCount > 9 ? "9+" : newCount}
        </span>
      )}
    </button>
  );
}
