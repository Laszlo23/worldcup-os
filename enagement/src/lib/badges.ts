/** Visual metadata for passport achievements (ids must match engagement.ts). */
export const PASSPORT_BADGE_META: Record<
  string,
  { detail: string; mark: string; rarity: "common" | "rare" | "epic" | "legend" }
> = {
  "first-predict": {
    detail: "Lock in your first XP poll call",
    mark: "KC",
    rarity: "common",
  },
  "streak-3": {
    detail: "Win three polls in a row",
    mark: "H3",
    rarity: "rare",
  },
  "streak-5": {
    detail: "Five-win heater — keep the streak alive",
    mark: "H5",
    rarity: "epic",
  },
  "sticker-collector": {
    detail: "Claim a moment or earn a sticker",
    mark: "MH",
    rarity: "common",
  },
  "stadium-proof": {
    detail: "Scan a stadium QR pitchside",
    mark: "SV",
    rarity: "rare",
  },
  "xp-500": {
    detail: "Hit 500 career XP",
    mark: "5X",
    rarity: "rare",
  },
  "xp-2000": {
    detail: "Bank 2,000 XP like a midfield engine",
    mark: "2K",
    rarity: "epic",
  },
  "sticker-collector-5": {
    detail: "Hold five stickers in the album",
    mark: "AL",
    rarity: "rare",
  },
  "set-growth-complete": {
    detail: "Complete the Growth Squad set",
    mark: "GS",
    rarity: "legend",
  },
  "clinical-10": {
    detail: "Win 10 settled polls",
    mark: "CF",
    rarity: "epic",
  },
  "season-ticket": {
    detail: "Cast 25 poll votes this season",
    mark: "ST",
    rarity: "epic",
  },
  "captains-armband": {
    detail: "Reach passport level 5",
    mark: "CA",
    rarity: "legend",
  },
  "highlight-reel": {
    detail: "Claim three goal moments",
    mark: "HR",
    rarity: "rare",
  },
  "stake-miner": {
    detail: "Stake XP or mine MM tokens",
    mark: "XM",
    rarity: "epic",
  },
  "human-passport": {
    detail: "Unique Humanity score ≥ 20 via Human Passport",
    mark: "HP",
    rarity: "legend",
  },
};

export function rarityClass(rarity: string): string {
  switch (rarity) {
    case "legend":
      return "border-gold/50 bg-gold/10 text-gold";
    case "epic":
      return "border-accent/45 bg-accent/12 text-accent";
    case "rare":
      return "border-primary/40 bg-primary/12 text-primary";
    default:
      return "border-border bg-card text-muted-foreground";
  }
}
