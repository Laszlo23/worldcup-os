export const rarityStyles: Record<string, { chip: string; ring: string; text: string; glow: string }> = {
  Common: {
    chip: "bg-muted/90 text-muted-foreground border border-border/60",
    ring: "ring-white/15",
    text: "text-foreground/90",
    glow: "shadow-[0_12px_40px_-16px_oklch(0_0_0_/_0.65)]",
  },
  Rare: {
    chip: "bg-accent/20 text-accent border border-accent/35",
    ring: "ring-accent/45",
    text: "text-accent",
    glow: "shadow-[0_0_28px_oklch(0.82_0.16_210_/_0.28),0_16px_48px_-18px_oklch(0_0_0_/_0.55)]",
  },
  Epic: {
    chip: "bg-primary/20 text-primary border border-primary/35",
    ring: "ring-primary/45",
    text: "text-primary",
    glow: "shadow-[0_0_32px_oklch(0.82_0.22_155_/_0.32),0_16px_48px_-18px_oklch(0_0_0_/_0.55)]",
  },
  Legendary: {
    chip: "bg-gold/20 text-gold border border-gold/40",
    ring: "ring-gold/55",
    text: "text-gold",
    glow: "shadow-[0_0_36px_oklch(0.82_0.15_85_/_0.38),0_16px_48px_-16px_oklch(0_0_0_/_0.55)]",
  },
};

export type StickerCardData = {
  id: string;
  title: string;
  description?: string;
  rarity: string;
  imageUrl: string;
  owned: boolean;
  earnedAt?: string;
  serial?: string;
  kind?: "static" | "moment";
};
