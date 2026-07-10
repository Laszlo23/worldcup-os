export const SITE_NAME = "World Cup OS";
export const SITE_TAGLINE = "Predict the World Cup. Trust the Blockchain.";
export const SITE_DESCRIPTION =
  "Non-custodial World Cup prediction markets powered by TxLINE oracle data and Solana escrow settlement. Place predictions on upcoming fixtures, verify proofs on-chain, and claim USDC rewards.";
export const SITE_URL = "https://wmos.buildingcultureid.space";
export const SITE_OG_IMAGE = `${SITE_URL}/og-image.svg`;
export const SITE_TWITTER = "@WorldCupOS";

export const defaultMeta = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  image: SITE_OG_IMAGE,
  type: "website" as const,
};

export function pageTitle(segment?: string): string {
  if (!segment) return defaultMeta.title;
  return `${segment} — ${SITE_NAME}`;
}

export function canonicalUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "" : normalized}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
