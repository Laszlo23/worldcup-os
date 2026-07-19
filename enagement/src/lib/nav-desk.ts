import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  BookOpen,
  CircleHelp,
  Crown,
  Gift,
  IdCard,
  Layers,
  Megaphone,
  Newspaper,
  Pickaxe,
  QrCode,
  Sparkles,
  Sticker,
  Store,
  Trophy,
  Users,
} from "lucide-react";

export type DeskLink = {
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "live";
};

export type DeskZone = {
  id: string;
  title: string;
  role: string;
  links: DeskLink[];
};

/** All MatchMind destinations as a tactics board (formation zones). */
export const DESK_ZONES: DeskZone[] = [
  {
    id: "attack",
    title: "Attack",
    role: "Play the match",
    links: [
      { to: "/", label: "Live", hint: "Score & video", icon: Activity, accent: "live" },
      { to: "/predict", label: "Polls", hint: "7-min XP calls", icon: Sparkles, accent: "accent" },
      { to: "/moments", label: "Drops", hint: "Goal stickers", icon: Layers, accent: "primary" },
      { to: "/news", label: "Ball News", hint: "Match desk", icon: Newspaper },
    ],
  },
  {
    id: "midfield",
    title: "Midfield",
    role: "Earn & grow",
    links: [
      { to: "/agent", label: "Agent", hint: "Auto-pilot", icon: Bot, accent: "accent" },
      { to: "/stake", label: "Mine", hint: "Stake XP → MM", icon: Pickaxe, accent: "primary" },
      { to: "/tasks", label: "Tasks", hint: "Community XP", icon: Trophy },
      { to: "/rewards", label: "Shop", hint: "Spend XP", icon: Gift },
      { to: "/legends", label: "Legends", hint: "Stats & collectables", icon: Crown, accent: "primary" },
      { to: "/market", label: "Market", hint: "Trade collectables for XP", icon: Store, accent: "accent" },
    ],
  },
  {
    id: "defense",
    title: "Defense",
    role: "Your kit",
    links: [
      { to: "/passport", label: "Profile", hint: "Wallet, socials, Human Passport", icon: IdCard, accent: "primary" },
      { to: "/community", label: "Crew", hint: "Chat & board", icon: Users, accent: "accent" },
      { to: "/wishes", label: "Wishes", hint: "Features & shoutouts", icon: Megaphone, accent: "accent" },
      {
        to: "/stadium",
        label: "Venue scan",
        hint: "Stadium / watch-party QR → live drops",
        icon: QrCode,
        accent: "live",
      },
      { to: "/stickers", label: "Album", hint: "Sticker shelf", icon: Sticker },
    ],
  },
  {
    id: "bench",
    title: "Bench",
    role: "Learn the system",
    links: [
      { to: "/faq", label: "FAQ", hint: "Quick answers", icon: CircleHelp },
      { to: "/docs", label: "Docs", hint: "How it works", icon: BookOpen },
    ],
  },
];

export const PRIMARY_RAIL = [
  { to: "/", label: "Live", icon: Activity },
  { to: "/predict", label: "Polls", icon: Sparkles },
  { to: "/community", label: "Crew", icon: Users },
  { to: "/passport", label: "You", icon: IdCard },
] as const;

export function flattenDeskLinks(): DeskLink[] {
  return DESK_ZONES.flatMap((z) => z.links);
}

export function filterDeskLinks(query: string): DeskLink[] {
  const q = query.trim().toLowerCase();
  if (!q) return flattenDeskLinks();
  return flattenDeskLinks().filter(
    (l) =>
      l.label.toLowerCase().includes(q) ||
      l.hint.toLowerCase().includes(q) ||
      l.to.toLowerCase().includes(q),
  );
}
