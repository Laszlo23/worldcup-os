import { Link } from "@tanstack/react-router";
import type { AppLegalBrand } from "@/content/legal";
import { APP_LEGAL_TAGLINE } from "@/content/legal";

const PARTNERS = [
  {
    name: "Solana",
    href: "https://solana.com",
    logo: "/partners/solana.svg",
    blurb: "On-chain escrow & settlement",
  },
  {
    name: "TxLINE",
    href: "https://txline-docs.txodds.com/",
    logo: "/partners/txline.svg",
    blurb: "Live oracle stream & stat-validation",
  },
  {
    name: "Superteam Earn",
    href: "https://superteam.fun/earn/agents",
    logo: "/partners/superteam-earn.svg",
    blurb: "Agent bounty discovery & payouts",
  },
] as const;

type PartnerFooterProps = {
  brand?: AppLegalBrand;
  compact?: boolean;
};

export function PartnerFooter({ brand = "wmos", compact = false }: PartnerFooterProps) {
  const tagline = APP_LEGAL_TAGLINE[brand];

  return (
    <footer className="border-t border-border/60 bg-gradient-to-b from-black/10 to-black/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!compact && (
          <div className="mb-8 rounded-2xl border border-primary/20 bg-card/40 p-5 sm:p-6 backdrop-blur-sm shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-4">Powered by</p>
            <div className="grid gap-6 sm:grid-cols-3">
              {PARTNERS.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <img
                    src={p.logo}
                    alt={p.name}
                    className="h-8 w-auto text-foreground opacity-90 group-hover:opacity-100"
                  />
                  <p className="text-xs text-muted-foreground">{p.blurb}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div>© {new Date().getFullYear()} {tagline}</div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 uppercase tracking-wider">
            <Link to="/faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/legal/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/legal/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
