import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Newspaper } from "lucide-react";
import type { BallNewsItem } from "@/lib/ball-news";
import { encodeNewsPostId } from "@/lib/ball-news";

function kindTone(kind: BallNewsItem["kind"]): string {
  switch (kind) {
    case "breaking":
      return "border-live/40 text-live bg-live/10";
    case "wire":
      return "border-accent/35 text-accent bg-accent/10";
    case "feature":
      return "border-primary/35 text-primary bg-primary/10";
    case "desk":
      return "border-border text-muted-foreground bg-muted/40";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function BallNewsHero({ item }: { item: BallNewsItem }) {
  return (
    <Link
      to="/news/$postId"
      params={{ postId: encodeNewsPostId(item.id) }}
      className="block outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/80"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${kindTone(item.kind)}`}
            >
              {item.kicker}
              {item.minuteLabel ? ` · ${item.minuteLabel}` : ""}
            </span>
            <h3 className="mt-2 font-display text-xl font-bold italic leading-tight tracking-tight text-balance">
              {item.headline}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-foreground/85">{item.lede}</p>
            <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
              Read story →
            </p>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

export function BallNewsCard({ item, compact }: { item: BallNewsItem; compact?: boolean }) {
  return (
    <Link
      to="/news/$postId"
      params={{ postId: encodeNewsPostId(item.id) }}
      className="block outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <article
        className={`flex gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/50 ${
          compact ? "p-2.5" : "p-3"
        }`}
      >
        <img
          src={item.image}
          alt=""
          className={`shrink-0 rounded-xl object-cover ${compact ? "size-16" : "size-20"}`}
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] ${kindTone(item.kind)}`}
          >
            {item.kicker}
          </span>
          <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{item.headline}</h4>
          {!compact ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.lede}</p>
          ) : null}
          <p className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
            Open →
          </p>
        </div>
      </article>
    </Link>
  );
}

export function BallNewsSection({
  items,
  limit = 4,
  showAllLink = true,
}: {
  items: BallNewsItem[];
  limit?: number;
  showAllLink?: boolean;
}) {
  if (items.length === 0) return null;
  const hero = items[0]!;
  const rest = items.slice(1, limit);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="size-3.5 text-primary" />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Ball News
          </p>
        </div>
        {showAllLink ? (
          <Link to="/news" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
            Full desk <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
      <BallNewsHero item={hero} />
      {rest.length > 0 ? (
        <div className="mt-3 space-y-2">
          {rest.map((item) => (
            <BallNewsCard key={item.id} item={item} compact />
          ))}
        </div>
      ) : null}
    </section>
  );
}
