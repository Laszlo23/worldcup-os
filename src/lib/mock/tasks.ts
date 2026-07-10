export type TaskCategory = "easy" | "community" | "builder";
export type TaskFilter = "all" | TaskCategory;

export interface CommunityTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  points: number;
  timeEstimate: string;
  ctaLabel: string;
  ctaUrl: string;
  featured?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}

export const COMMUNITY_TASKS: CommunityTask[] = [
  {
    id: "follow-x",
    title: "Follow World Cup OS on X",
    description: "Stay updated on TxLINE integrations, settlement proofs, and hackathon milestones.",
    category: "community",
    points: 50,
    timeEstimate: "1 min",
    ctaLabel: "Follow on X",
    ctaUrl: "https://x.com/intent/follow?screen_name=worldcupos",
    featured: true,
  },
  {
    id: "join-telegram",
    title: "Join the community Telegram",
    description: "Connect with builders, share replay demos, and get help with wallet setup.",
    category: "community",
    points: 40,
    timeEstimate: "2 min",
    ctaLabel: "Join Telegram",
    ctaUrl: "https://t.me/worldcupos",
  },
  {
    id: "share-replay",
    title: "Share your replay demo",
    description: "Run a 90-second match replay and share the Oracle Command Center screenshot.",
    category: "builder",
    points: 75,
    timeEstimate: "5 min",
    ctaLabel: "Open Replay",
    ctaUrl: "/replay",
    imageSrc: "/moment-topbin.jpg",
    imageAlt: "Ball curls into the top corner",
  },
  {
    id: "first-prediction",
    title: "Place your first prediction",
    description: "Connect Phantom, pick a live market, and lock USDC in Solana escrow.",
    category: "easy",
    points: 25,
    timeEstimate: "3 min",
    ctaLabel: "Browse Markets",
    ctaUrl: "/markets",
    imageSrc: "/moment-volley.jpg",
    imageAlt: "Player volleys the ball under stadium lights",
  },
  {
    id: "verify-proof",
    title: "Verify a match certificate",
    description: "Open Proof Explorer, copy the Merkle root, and check the Solana explorer link.",
    category: "easy",
    points: 30,
    timeEstimate: "2 min",
    ctaLabel: "View Proofs",
    ctaUrl: "/proofs",
    imageSrc: "/moment-save.jpg",
    imageAlt: "Goalkeeper makes a decisive save",
  },
  {
    id: "oracle-tour",
    title: "Tour the Oracle Command Center",
    description: "Watch the TxLINE pipeline light up with live goals, odds, and settlement events.",
    category: "easy",
    points: 20,
    timeEstimate: "1 min",
    ctaLabel: "Open Oracle",
    ctaUrl: "/oracle",
  },
  {
    id: "connect-wallet",
    title: "Connect your Solana wallet",
    description: "Sign in with Phantom on a top-level browser tab to unlock portfolio and predictions.",
    category: "easy",
    points: 15,
    timeEstimate: "1 min",
    ctaLabel: "Connect Wallet",
    ctaUrl: "/settings",
  },
  {
    id: "star-github",
    title: "Star us on GitHub",
    description: "Help judges discover the open-source World Cup OS protocol.",
    category: "builder",
    points: 35,
    timeEstimate: "1 min",
    ctaLabel: "Star Repo",
    ctaUrl: "https://github.com/Laszlo23/worldcup-os",
  },
];
