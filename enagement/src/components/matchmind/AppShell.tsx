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
  backdropVariant = "pitch",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backdropVariant?: SoccerBackdropVariant;
}) {
  const wallet = useAppStore((s) => s.wallet);
  const storeXp = useAppStore((s) => s.xp);
  const { data: passportData } = usePassport(wallet.connected);
  const xp = passportData?.passport.xp ?? storeXp;

  return (
    <div className="min-h-screen w-full text-foreground">
      <DevnetBanner />
      <SoccerBackdrop variant={backdropVariant} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[480px] flex-col">
        <header className="sticky top-0 z-30 mm-glass border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
                <span className="font-mono text-[11px] font-bold tracking-tighter text-primary">MM</span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  MatchMind AI
                </p>
                <h1 className="text-sm font-semibold leading-tight">{title}</h1>
                {subtitle ? <p className="text-[10px] text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1">
                <span className="size-1.5 rounded-full bg-primary mm-pulse-glow" />
                <span className="font-mono text-[10px] font-bold text-primary">{xp.toLocaleString()} XP</span>
              </div>
              <Link
                to="/stadium"
                className="grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:text-primary"
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
