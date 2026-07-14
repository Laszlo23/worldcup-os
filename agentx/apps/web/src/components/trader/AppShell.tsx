"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Home, Radio, Brain, Wallet, MoreHorizontal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useTraderSocketConnected } from "@/lib/trader-socket-provider";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { DevnetFaucetButton } from "@/components/wallet/devnet-faucet";
import { useWalletStore } from "@/lib/store/wallet";
import { LegalDisclaimer } from "@/components/seo/legal-disclaimer";
import { DevnetBanner } from "@/components/site/devnet-banner";
import { PartnerFooter } from "@/components/site/partner-footer";
import { SoccerBackdrop } from "@/components/soccer/soccer-backdrop";
import type { SoccerBackdropVariant } from "@/lib/soccer-assets";

const NAV = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/matches", icon: Radio, label: "Matches" },
  { href: "/signals", icon: Brain, label: "Signals" },
  { href: "/portfolio", icon: Wallet, label: "Portfolio" },
  { href: "/more", icon: MoreHorizontal, label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border glass pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors", active ? "text-gold" : "text-muted-foreground")}>
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_oklch(0.78_0.14_85)]")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function LiveBadge({ connected, lastEventAt }: { connected: boolean; lastEventAt?: string | null }) {
  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        OFFLINE
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-xs font-medium text-green" title={lastEventAt ? `Last event: ${lastEventAt}` : undefined}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
      LIVE
    </span>
  );
}

export function AppHeader() {
  const wallet = useWalletStore((s) => s.wallet);
  const connected = useTraderSocketConnected();
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: () => api.health(), refetchInterval: 30000 });

  return (
    <header className="sticky top-0 z-40 border-b border-border glass pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gold-gradient">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-widest text-gold">TxLINE</p>
            <p className="truncate text-sm font-bold leading-none">AI TRADER</p>
          </div>
        </div>
        <div className="hidden shrink-0 sm:block">
          <LiveBadge connected={connected} lastEventAt={health?.lastEventAt} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2 sm:border-0 sm:px-4 sm:pb-3">
        {wallet.connected ? (
          <span className="text-xs text-muted-foreground">{wallet.balance.toFixed(0)} USDC</span>
        ) : (
          <span className="text-xs text-muted-foreground sm:hidden">Devnet demo</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <DevnetFaucetButton />
          <ConnectWalletButton compact />
          <div className="sm:hidden">
            <LiveBadge connected={connected} lastEventAt={health?.lastEventAt} />
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShell({
  children,
  showDisclaimer = false,
  backdropVariant = "playersDark",
}: {
  children: React.ReactNode;
  showDisclaimer?: boolean;
  backdropVariant?: SoccerBackdropVariant;
}) {
  return (
    <>
      <DevnetBanner />
      <SoccerBackdrop variant={backdropVariant} />
      <div className="relative z-10 mx-auto min-h-dvh max-w-lg pb-20">
        <AppHeader />
        <main className="px-4 py-4">
          {children}
          {showDisclaimer && <LegalDisclaimer className="mt-6" />}
        </main>
        <PartnerFooter compact />
        <BottomNav />
      </div>
    </>
  );
}
