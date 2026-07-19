import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { DevnetBanner } from "@/components/site/devnet-banner";
import { PartnerFooter } from "@/components/site/partner-footer";
import { SoccerBackdrop } from "@/components/soccer/soccer-backdrop";
import { useAppStore } from "@/lib/store";
import { usePassport } from "@/lib/queries/hooks";
import type { SoccerBackdropVariant } from "@/lib/soccer-assets";

export function AppShell({
  title,
  subtitle,
  children,
  backdropVariant = "stadium",
  backdropIntensity = "subtle",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backdropVariant?: SoccerBackdropVariant;
  backdropIntensity?: "subtle" | "hero";
}) {
  const wallet = useAppStore((s) => s.wallet);
  const storeXp = useAppStore((s) => s.xp);
  const { data: passportData } = usePassport(wallet.connected);
  const xp = passportData?.passport.xp ?? storeXp;

  return (
    <div className="min-h-screen w-full text-foreground">
      <DevnetBanner />
      <SoccerBackdrop variant={backdropVariant} intensity={backdropIntensity} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[480px] flex-col">
        <header className="sticky top-0 z-30 glass-strong border-b border-accent/15 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src="/brand/logo.svg"
                alt="MatchMind AI"
                width={36}
                height={36}
                className="brand-mark size-9 shrink-0 rounded-xl"
              />
              <div className="min-w-0">
                <p className="font-display text-[11px] font-semibold tracking-[0.22em] text-accent">
                  MATCHMIND
                </p>
                <h1 className="truncate font-display text-sm font-semibold leading-tight tracking-tight">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-accent mm-pulse-glow" />
                <span className="font-mono text-[10px] font-bold text-accent">{xp.toLocaleString()} XP</span>
              </div>
              <Link
                to="/stadium"
                className="grid size-9 place-items-center rounded-xl border border-border/80 glass text-foreground transition-colors hover:border-accent/50 hover:text-accent"
                aria-label="Scan stadium QR"
              >
                <QrCode className="size-4" />
              </Link>
              <ConnectWalletButton />
            </div>
          </div>
        </header>
        <main className="flex-1 pb-28">{children}</main>
        <PartnerFooter compact />
        <BottomNav />
      </div>
    </div>
  );
}
