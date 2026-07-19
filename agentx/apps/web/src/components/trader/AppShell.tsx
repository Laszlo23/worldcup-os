"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Home, Radio, Brain, Wallet, MoreHorizontal } from "lucide-react";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/15 glass-strong pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1.5 py-1.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-medium tracking-wide transition-all",
                active ? "text-gold" : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl bg-gold/10 ring-1 ring-gold/20" aria-hidden />
              )}
              <Icon className={cn("relative h-5 w-5", active && "drop-shadow-[0_0_10px_oklch(0.82_0.145_88_/_0.7)]")} />
              <span className="relative">{label}</span>
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
      <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        OFFLINE
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green/12 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-green"
      title={lastEventAt ? `Last event: ${lastEventAt}` : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green animate-live-dot" />
      LIVE
    </span>
  );
}

export function AppHeader() {
  const wallet = useWalletStore((s) => s.wallet);
  const connected = useTraderSocketConnected();
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: () => api.health(), refetchInterval: 30000 });

  return (
    <header className="sticky top-0 z-40 border-b border-gold/15 glass-strong pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 transition hover:opacity-90">
          <img
            src="/brand/logo.svg"
            alt="AgentX"
            width={36}
            height={36}
            className="brand-mark relative h-9 w-9 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-gold">AGENTX</p>
            <p className="truncate font-display text-sm font-bold leading-none tracking-tight">TxLINE Trader</p>
          </div>
        </Link>
        <div className="hidden shrink-0 sm:block">
          <LiveBadge connected={connected} lastEventAt={health?.lastEventAt} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-2 sm:border-0 sm:px-4 sm:pb-3">
        {wallet.connected ? (
          <span className="font-mono text-xs text-muted-foreground">
            <span className="text-gold">{wallet.balance.toFixed(0)}</span> USDC
          </span>
        ) : (
          <span className="text-xs text-muted-foreground sm:hidden">Devnet demo</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
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
  backdropVariant = "action",
  backdropIntensity = "subtle",
}: {
  children: React.ReactNode;
  showDisclaimer?: boolean;
  backdropVariant?: SoccerBackdropVariant;
  backdropIntensity?: "subtle" | "hero";
}) {
  return (
    <>
      <DevnetBanner />
      <SoccerBackdrop variant={backdropVariant} intensity={backdropIntensity} />
      <div className="relative z-10 mx-auto min-h-dvh max-w-lg pb-20">
        <AppHeader />
        <main className="px-4 py-5">
          {children}
          {showDisclaimer && <LegalDisclaimer className="mt-8" />}
        </main>
        <PartnerFooter compact />
        <BottomNav />
      </div>
    </>
  );
}
