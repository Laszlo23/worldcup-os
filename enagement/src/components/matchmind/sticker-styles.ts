export const rarityStyles: Record<string, { chip: string; ring: string; text: string; glow: string }> = {
  Common: {
    chip: "bg-muted text-muted-foreground",
    ring: "ring-border",
    text: "text-foreground",
    glow: "",
  },
  Rare: {
    chip: "bg-accent/20 text-accent",
    ring: "ring-accent/40",
    text: "text-accent",
    glow: "shadow-[0_0_20px_rgba(var(--accent-rgb,120,200,255),0.25)]",
  },
  Epic: {
    chip: "bg-primary/20 text-primary",
    ring: "ring-primary/40",
    text: "text-primary",
    glow: "shadow-[0_0_24px_rgba(var(--primary-rgb,80,200,120),0.3)]",
  },
  Legendary: {
    chip: "bg-gold/20 text-gold",
    ring: "ring-gold/50",
    text: "text-gold",
    glow: "shadow-[0_0_28px_rgba(234,179,8,0.35)]",
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
