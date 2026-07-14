import { motion } from "framer-motion";
import { StickerCard } from "./StickerCard";
import type { StickerCardData } from "./sticker-styles";

export type StickerAlbumSet = {
  id: string;
  title: string;
  owned: number;
  total: number;
  stickers: StickerCardData[];
};

export function StickerAlbum({ sets }: { sets: StickerAlbumSet[] }) {
  return (
    <div className="space-y-8">
      {sets.map((set) => {
        const pct = set.total > 0 ? Math.round((set.owned / set.total) * 100) : 0;
        return (
          <section key={set.id}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  {set.title}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {set.owned}/{set.total} collected
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-primary">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={false}
                animate={{ width: `${pct}%` }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {set.stickers.map((s) => (
                <StickerCard key={s.id} sticker={s} size="md" />
              ))}
            </div>
            {set.stickers.length === 0 ? (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                {set.id === "set-goals"
                  ? "Goal stickers drop when TxLINE reports a goal."
                  : "Engage during live matches to unlock these stickers."}
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function StickerShelf({ stickers }: { stickers: StickerCardData[] }) {
  if (stickers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Vote, share, and claim goal drops to fill your shelf.</p>
    );
  }
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
      {stickers.slice(0, 4).map((s) => (
        <StickerCard key={s.id} sticker={s} size="sm" />
      ))}
    </div>
  );
}
