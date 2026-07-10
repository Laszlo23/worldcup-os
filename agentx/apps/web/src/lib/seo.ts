import type { Metadata } from "next";

const SITE = "https://agentx.buildingcultureid.space";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "TxLINE AI Trader",
    template: "%s | TxLINE AI Trader",
  },
  description:
    "AI-powered sports intelligence platform — real-time TxLINE data, autonomous agent strategies, and on-chain prediction certificates on Solana.",
  keywords: [
    "TxLINE",
    "AI sports analytics",
    "prediction intelligence",
    "Solana",
    "autonomous trading agents",
    "sports data",
    "on-chain certificates",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "TxLINE AI Trader",
    description: "Real-time sports intelligence, autonomous AI agents, and on-chain transparency.",
    url: SITE,
    siteName: "TxLINE AI Trader",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "TxLINE AI Trader" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TxLINE AI Trader",
    description: "Real-time sports intelligence, autonomous AI agents, and on-chain transparency.",
    images: ["/og-image.svg"],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TxLINE AI" },
};
