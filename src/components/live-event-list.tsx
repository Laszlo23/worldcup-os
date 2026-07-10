import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { liveEventLabel } from "@/lib/live-events";
import { authorAvatar, authorLabel, type FeedItem } from "@/lib/feed-items";
import { Radio, TrendingUp, ShieldCheck, Zap, CircleDot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatFeedTime } from "@/lib/format-time";

const ICONS: Record<string, typeof Radio> = {
  goal: CircleDot,
  odds_update: TrendingUp,
  market_close: Zap,
  settlement: ShieldCheck,
  proof_verified: ShieldCheck,
  settlement_started: ShieldCheck,
  tx_confirmed: ShieldCheck,
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
    case "proof_verified":
    case "tx_confirmed":
      return "border-primary/50";
    default:
      return "border-border";
  }
}

type LiveEventListProps = {
  items: FeedItem[];
  variant?: "timeline" | "chat";
  className?: string;
  autoScroll?: boolean;
  currentWallet?: string;
};

export function LiveEventList({
  items,
  variant = "timeline",
  className,
  autoScroll = false,
  currentWallet,
}: LiveEventListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (autoScroll && !pausedRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [items.length, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    pausedRef.current = !atBottom;
  };

  if (variant === "chat") {
    return (
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn("space-y-2 overflow-y-auto h-full", className)}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) =>
            item.kind === "oracle" ? (
              <OracleChatBubble key={`oracle-${item.feedKey}`} item={item} />
            ) : (
              <UserChatBubble
                key={`user-${item.id}`}
                item={item}
                isOwn={Boolean(currentWallet && item.author.walletPubkey === currentWallet)}
              />
            ),
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full min-h-[240px] pr-3", className)}>
      <div className="space-y-2 font-mono text-xs">
        <AnimatePresence mode="popLayout">
          {items.map((item, i) =>
            item.kind === "oracle" ? (
              <motion.div
                key={`oracle-${item.feedKey}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className={`flex gap-3 py-2.5 border-l-2 pl-3 hover:bg-muted/20 rounded-r transition-colors ${eventBorder(item.event_type)}`}
              >
                <span className="text-muted-foreground shrink-0 w-[4.5rem] tabular-nums text-[10px]">
                  {formatFeedTime(item.created_at)}
                </span>
                <span className="shrink-0 opacity-80">{eventIcon(item.event_type)}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{item.title}</div>
                  {item.body && <div className="text-muted-foreground truncate">{item.body}</div>}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`user-${item.id}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="flex gap-3 py-2.5 border-l-2 pl-3 border-border/60 hover:bg-muted/20 rounded-r"
              >
                <span className="text-muted-foreground shrink-0 w-[4.5rem] tabular-nums text-[10px]">
                  {formatFeedTime(item.created_at)}
                </span>
                <span className="shrink-0 opacity-80">
                  <User className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{authorLabel(item.author)}</div>
                  <div className="text-muted-foreground truncate">{item.body}</div>
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function OracleChatBubble({ item }: { item: Extract<FeedItem, { kind: "oracle" }> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
    >
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
        {eventIcon(item.event_type)}
      </div>
      <div className="flex-1 min-w-0 glass rounded-xl rounded-tl-sm px-3 py-2 border border-border/50">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono uppercase text-primary">{liveEventLabel(item.event_type)}</span>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{formatFeedTime(item.created_at)}</span>
        </div>
        <div className="text-xs font-medium leading-snug">{item.title}</div>
        {item.body && <div className="text-[11px] text-muted-foreground mt-0.5">{item.body}</div>}
      </div>
    </motion.div>
  );
}

function UserChatBubble({
  item,
  isOwn,
}: {
  item: Extract<FeedItem, { kind: "user" }>;
  isOwn: boolean;
}) {
  const avatar = authorAvatar(item.author);
  const label = authorLabel(item.author);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2", isOwn && "flex-row-reverse")}
    >
      {avatar ? (
        <img src={avatar} alt="" className="shrink-0 w-8 h-8 rounded-full object-cover border border-border/50" />
      ) : (
        <div className="shrink-0 w-8 h-8 rounded-full bg-muted border border-border/50 flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div
        className={cn(
          "flex-1 min-w-0 max-w-[85%] rounded-xl px-3 py-2 border",
          isOwn
            ? "rounded-tr-sm bg-primary/15 border-primary/30 ml-auto"
            : "rounded-tl-sm glass border-border/50",
        )}
      >
        <div className={cn("flex items-center gap-2 mb-0.5", isOwn && "justify-end")}>
          {!isOwn && <span className="text-[10px] font-medium truncate">{label}</span>}
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
            {formatFeedTime(item.created_at)}
          </span>
        </div>
        <div className={cn("text-xs leading-snug whitespace-pre-wrap break-words", isOwn && "text-right")}>
          {item.body}
        </div>
      </div>
    </motion.div>
  );
}
