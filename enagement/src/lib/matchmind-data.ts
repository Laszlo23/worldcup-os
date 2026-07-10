import momentVolley from "@/assets/moment-volley.jpg";
import momentSave from "@/assets/moment-save.jpg";
import momentTopbin from "@/assets/moment-topbin.jpg";
import rewardJersey from "@/assets/reward-jersey.jpg";
import rewardVip from "@/assets/reward-vip.jpg";
import rewardBoots from "@/assets/reward-boots.jpg";

export type Team = { code: string; name: string; color: string };

export const match = {
  home: { code: "MAD", name: "Real Madrid", color: "#FFFFFF" } as Team,
  away: { code: "MCI", name: "Manchester City", color: "#6CADDF" } as Team,
  homeScore: 2,
  awayScore: 1,
  minute: 74,
  competition: "UEFA Champions League",
  venue: "Santiago Bernabéu",
  momentum: 0.68, // 0 away → 1 home
};

export type TimelineEvent = {
  minute: number;
  team: "home" | "away";
  type: "goal" | "yellow" | "sub" | "shot" | "save" | "corner";
  player: string;
  detail?: string;
};

export const timeline: TimelineEvent[] = [
  { minute: 8, team: "home", type: "shot", player: "Vinícius Jr.", detail: "Blocked" },
  { minute: 14, team: "home", type: "goal", player: "Bellingham", detail: "Header, 1-0" },
  { minute: 27, team: "away", type: "yellow", player: "Rodri" },
  { minute: 36, team: "away", type: "goal", player: "Haaland", detail: "Rebound, 1-1" },
  { minute: 52, team: "home", type: "save", player: "Courtois", detail: "One-on-one denied" },
  { minute: 61, team: "home", type: "sub", player: "Modrić ↑ Camavinga" },
  { minute: 68, team: "home", type: "goal", player: "Vinícius Jr.", detail: "Curler, 2-1" },
  { minute: 72, team: "away", type: "corner", player: "De Bruyne" },
];

export type PlayerStat = {
  name: string;
  team: "home" | "away";
  rating: number;
  goals: number;
  shots: number;
  passes: number;
  passAcc: number;
};

export const players: PlayerStat[] = [
  { name: "Vinícius Jr.", team: "home", rating: 8.7, goals: 1, shots: 5, passes: 42, passAcc: 88 },
  { name: "Bellingham", team: "home", rating: 8.4, goals: 1, shots: 3, passes: 61, passAcc: 92 },
  { name: "Courtois", team: "home", rating: 8.1, goals: 0, shots: 0, passes: 22, passAcc: 78 },
  { name: "Haaland", team: "away", rating: 7.6, goals: 1, shots: 4, passes: 18, passAcc: 71 },
  { name: "De Bruyne", team: "away", rating: 7.9, goals: 0, shots: 2, passes: 58, passAcc: 89 },
];

export type AiCommentary = { minute: number; body: string; kind: "tactical" | "hype" | "insight" };

export const commentary: AiCommentary[] = [
  {
    minute: 74,
    kind: "tactical",
    body: "Madrid's high-press intensity is up 22% in the last 10'. Expect a threat down the left flank.",
  },
  {
    minute: 71,
    kind: "hype",
    body: "The Bernabéu is deafening — xG momentum has swung sharply to the home side.",
  },
  {
    minute: 68,
    kind: "insight",
    body: "Vinícius Jr. becomes the youngest player to score in 4 straight UCL knockout ties.",
  },
  {
    minute: 61,
    kind: "tactical",
    body: "Ancelotti brings on Modrić — a signal to slow the tempo and control second phases.",
  },
];

export type Prediction = {
  id: string;
  question: string;
  window: string;
  countdown: number; // seconds
  probability: number; // 0..1
  yesReward: number;
  noReward: number;
  voters: number;
};

export const predictions: Prediction[] = [
  {
    id: "p1",
    question: "Will there be a goal in the next 7 minutes?",
    window: "Ends 81'",
    countdown: 412,
    probability: 0.42,
    yesReward: 450,
    noReward: 120,
    voters: 3102,
  },
  {
    id: "p2",
    question: "Will Bellingham record a shot on target before 80'?",
    window: "Ends 80'",
    countdown: 320,
    probability: 0.68,
    yesReward: 250,
    noReward: 140,
    voters: 1980,
  },
  {
    id: "p3",
    question: "Will the next attack create a shot?",
    window: "Next possession",
    countdown: 45,
    probability: 0.55,
    yesReward: 90,
    noReward: 60,
    voters: 842,
  },
  {
    id: "p4",
    question: "Will Rodri receive a second yellow?",
    window: "Remainder of match",
    countdown: 960,
    probability: 0.18,
    yesReward: 900,
    noReward: 40,
    voters: 2410,
  },
];

export type MomentRarity = "Common" | "Rare" | "Epic" | "Legendary";

export type Moment = {
  id: string;
  title: string;
  player: string;
  minute: number;
  match: string;
  rarity: MomentRarity;
  serial: string;
  image: string;
  collectedAt: string;
};

export const moments: Moment[] = [
  {
    id: "m1",
    title: "The 68' Curler",
    player: "Vinícius Jr.",
    minute: 68,
    match: "MAD vs MCI · UCL SF",
    rarity: "Legendary",
    serial: "#082 / 100",
    image: momentVolley,
    collectedAt: "Just now",
  },
  {
    id: "m2",
    title: "One-on-One Denied",
    player: "Courtois",
    minute: 52,
    match: "MAD vs MCI · UCL SF",
    rarity: "Epic",
    serial: "#310 / 500",
    image: momentSave,
    collectedAt: "22 min ago",
  },
  {
    id: "m3",
    title: "Top Bin, Bernabéu",
    player: "Bellingham",
    minute: 14,
    match: "MAD vs MCI · UCL SF",
    rarity: "Rare",
    serial: "#1204 / 2500",
    image: momentTopbin,
    collectedAt: "1h ago",
  },
];

export type Reward = {
  id: string;
  title: string;
  category: "Merch" | "Ticket" | "VIP" | "Experience";
  cost: number;
  image: string;
  supply: string;
};

export const rewards: Reward[] = [
  {
    id: "r1",
    title: "Match-Worn Signed Jersey",
    category: "Merch",
    cost: 12500,
    image: rewardJersey,
    supply: "3 left",
  },
  {
    id: "r2",
    title: "VIP Pitch-side Pair",
    category: "VIP",
    cost: 48000,
    image: rewardVip,
    supply: "1 left",
  },
  {
    id: "r3",
    title: "Team-Issued Boots",
    category: "Merch",
    cost: 6800,
    image: rewardBoots,
    supply: "12 left",
  },
  {
    id: "r4",
    title: "Champions League Final Ticket",
    category: "Ticket",
    cost: 90000,
    image: rewardVip,
    supply: "5 left",
  },
  {
    id: "r5",
    title: "Player Meet & Greet",
    category: "Experience",
    cost: 35000,
    image: rewardJersey,
    supply: "2 left",
  },
];

export const passport = {
  handle: "@stadium.rat",
  tier: "Elite",
  season: 4,
  level: 42,
  xp: 14205,
  xpToNext: 18000,
  matchesWatched: 128,
  predictionsWon: 214,
  predictionsTotal: 340,
  momentsCollected: 12,
  stadiumsVerified: 4,
  streak: 9,
  achievements: [
    { id: "a1", label: "First Blood", detail: "Predicted the opening goal", earned: true },
    { id: "a2", label: "Bernabéu Verified", detail: "Scanned in at 3 home fixtures", earned: true },
    { id: "a3", label: "Legendary Collector", detail: "Own a Legendary moment", earned: true },
    { id: "a4", label: "Perfect Half", detail: "5/5 predictions in a half", earned: false },
    { id: "a5", label: "Season Ticket", detail: "Watch every group-stage tie", earned: false },
  ],
};

export function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}