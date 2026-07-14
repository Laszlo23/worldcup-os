"use client";

import Link from "next/link";
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

export function PartnerFooter({ compact = false }: { compact?: boolean }) {
  const tagline = APP_LEGAL_TAGLINE.agentx;

  return (
    <footer className="border-t border-border/60 bg-gradient-to-b from-black/10 to-black/30">
      <div className="max-w-lg mx-auto px-4 py-8">
        {!compact && (
          <div className="mb-8 rounded-2xl border border-primary/20 bg-card/40 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-4">Powered by</p>
            <div className="grid gap-4">
              {PARTNERS.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:border-gold/40"
                >
                  <img src={p.logo} alt={p.name} className="h-8 w-auto" />
                  <p className="text-xs text-muted-foreground">{p.blurb}</p>
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col items-center gap-4 text-xs font-mono text-muted-foreground">
          <div>© {new Date().getFullYear()} {tagline}</div>
          <div className="flex flex-wrap items-center justify-center gap-4 uppercase tracking-wider">
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
