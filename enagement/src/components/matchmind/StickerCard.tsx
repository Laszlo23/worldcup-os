import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { rarityStyles, type StickerCardData } from "./sticker-styles";

export function StickerCard({
  sticker,
  size = "md",
  onClick,
}: {
  sticker: StickerCardData;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const style = rarityStyles[sticker.rarity] ?? rarityStyles.Common;
  const locked = !sticker.owned;
  const sizeClass =
    size === "lg" ? "aspect-[4/5] w-full" : size === "sm" ? "aspect-square w-[88px] shrink-0" : "aspect-[3/4] w-full";

  const inner = (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`group relative overflow-hidden rounded-2xl bg-black ring-2 ${style.ring} ${style.glow} ${sizeClass} ${
        locked ? "opacity-70" : ""
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-black/50" />
      <img
        src={sticker.imageUrl}
        alt={sticker.title}
        className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${
          locked ? "grayscale brightness-50" : ""
        }`}
        loading="lazy"
      />
      {locked ? (
        <div className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-[1px]">
          <div className="grid size-10 place-items-center rounded-full border border-white/15 bg-black/40">
            <Lock className="size-5 text-muted-foreground" />
          </div>
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-2.5">
        <div className="mb-1 flex items-center justify-between gap-1">
          <span
            className={`rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${style.chip}`}
          >
            {sticker.rarity}
          </span>
          {sticker.kind === "moment" ? (
            <span className="font-mono text-[8px] uppercase tracking-wider text-accent">Moment</span>
          ) : null}
        </div>
        <h4 className="font-display text-xs font-bold italic uppercase leading-tight text-white line-clamp-2">
          {sticker.title}
        </h4>
        {sticker.serial ? (
          <p className="mt-0.5 font-mono text-[8px] text-primary">{sticker.serial}</p>
        ) : null}
      </div>
      <div className="pointer-events-none absolute -right-3 -top-3 size-16 rotate-12 rounded-full border border-white/10 bg-white/5" />
    </motion.div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left">
        {inner}
      </button>
    );
  }
  return inner;
}
