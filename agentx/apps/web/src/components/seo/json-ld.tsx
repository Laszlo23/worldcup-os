const SITE = "https://agentx.buildingcultureid.space";

export function HomeJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "TxLINE AI Trader",
        url: SITE,
        applicationCategory: "FinanceApplication",
        description: "AI-powered sports intelligence with autonomous agents and on-chain transparency.",
        operatingSystem: "Web",
      },
      {
        "@type": "Organization",
        name: "TxLINE AI Trader",
        url: SITE,
        logo: `${SITE}/brand/logo.png`,
      },
    ],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}
