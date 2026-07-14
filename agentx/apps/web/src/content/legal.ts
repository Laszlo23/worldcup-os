export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
};

export const DEVNET_DISCLAIMER =
  "This deployment runs on Solana Devnet. Stakes use test USDC with no real-world monetary value. Do not treat outcomes as gambling or financial advice.";

export const RISK_DISCLAIMER =
  "Prediction markets involve speculative risk. Past performance of agents or oracles does not guarantee future results.";

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  updatedAt: "July 14, 2026",
  intro:
    "These Terms govern your use of the World Cup OS ecosystem (World Cup OS, MatchMind AI, and TxLINE AI Trader). By connecting a wallet or using our services, you agree to these Terms.",
  sections: [
    {
      title: "Demo & Devnet",
      paragraphs: [
        DEVNET_DISCLAIMER,
        "The platform is provided for hackathon demonstration and research. We may reset data, contracts, or balances without notice.",
      ],
    },
    {
      title: "Non-custodial wallet",
      paragraphs: [
        "You retain control of your wallet and private keys. We never custody funds. Every stake requires your explicit signature on Solana.",
        "Session cookies store only a signed authentication token tied to your wallet public key.",
      ],
    },
    {
      title: "Oracle data",
      paragraphs: [
        "Match scores, odds, and settlement proofs are sourced from TxLINE (TxODDS). We do not guarantee uninterrupted feeds or correctness beyond TxLINE's published validation.",
        "Settlement occurs when TxLINE reports a final fixture state and stat-validation is available.",
      ],
    },
    {
      title: "Eligibility",
      paragraphs: [
        "You must comply with applicable laws in your jurisdiction. You are responsible for determining whether prediction or fan-engagement features are permitted where you live.",
        "We do not offer KYC onboarding on this demo deployment.",
      ],
    },
    {
      title: "Superteam Earn agents",
      paragraphs: [
        "Autonomous agents may discover bounties and submit work via Superteam Earn. Payouts require a human operator to claim the agent identity on superteam.fun.",
        "Agent submissions do not constitute employment or guaranteed compensation.",
      ],
    },
    {
      title: "Limitation of liability",
      paragraphs: [
        RISK_DISCLAIMER,
        'Services are provided "as is" without warranties. We are not liable for losses arising from devnet resets, RPC outages, wallet errors, or oracle delays.',
      ],
    },
  ],
};

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  updatedAt: "July 14, 2026",
  intro:
    "We collect minimal data required to operate non-custodial sports intelligence and fan engagement features.",
  sections: [
    {
      title: "What we collect",
      paragraphs: [
        "Wallet public key (pseudonymous identifier), session auth tokens, prediction and engagement history stored in our database.",
        "Optional: Farcaster profile linkage if you connect social accounts in Settings.",
      ],
    },
    {
      title: "What we do not collect",
      paragraphs: [
        "Private keys, seed phrases, government IDs, or payment card data.",
        "We do not sell personal data to third parties.",
      ],
    },
    {
      title: "Cookies & sessions",
      paragraphs: [
        "HttpOnly session cookies authenticate API requests after wallet signature verification. Cookies expire per server configuration.",
      ],
    },
    {
      title: "Third-party services",
      paragraphs: [
        "TxLINE provides live match oracle streams. Solana RPC providers process on-chain transactions you sign.",
        "Superteam Earn processes agent bounty submissions under their own policies when you use Earn integrations.",
      ],
    },
    {
      title: "Data retention",
      paragraphs: [
        "Prediction, escrow, and engagement records persist in Postgres for demo analytics and settlement. You may disconnect your wallet at any time; on-chain data remains on Solana.",
      ],
    },
    {
      title: "Contact",
      paragraphs: ["Questions: open an issue on the public GitHub repository listed in our hackathon submission."],
    },
  ],
};

export type AppLegalBrand = "wmos" | "matchmind" | "agentx";

export const APP_LEGAL_TAGLINE: Record<AppLegalBrand, string> = {
  wmos: "World Cup OS · Trust Layer Protocol",
  matchmind: "MatchMind AI · Fan engagement on TxLINE",
  agentx: "TxLINE AI Trader · Autonomous agent arena",
};
