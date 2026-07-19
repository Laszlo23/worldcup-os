import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, QrCode, Wallet } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { OnboardingFlow } from "./OnboardingFlow";
import { AutoAgentRunner } from "./AutoAgentRunner";
import { WalletDesk } from "./WalletDesk";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { DevnetBanner } from "@/components/site/devnet-banner";
import { PartnerFooter } from "@/components/site/partner-footer";
import { SoccerBackdrop } from "@/components/soccer/soccer-backdrop";
import { useAppStore } from "@/lib/store";
import { usePassport } from "@/lib/queries/hooks";
import { applyFanKit } from "@/lib/fan-kit";
import { captureReferralFromUrl } from "@/components/matchmind/ReferralCard";
import type { SoccerBackdropVariant } from "@/lib/soccer-assets";

export function AppShell({
  title,
  subtitle,
  children,
  backdropVariant = "pitch",
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
  const streak = passportData?.passport.streak ?? 0;
  const [walletDeskOpen, setWalletDeskOpen] = useState(false);

  useEffect(() => {
    applyFanKit();
    captureReferralFromUrl();
  }, []);

  return (
    <div className="min-h-screen w-full text-foreground">
      <DevnetBanner />
      <SoccerBackdrop variant={backdropVariant} intensity={backdropIntensity} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[480px] flex-col">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <Link to="/" className="flex min-w-0 items-center gap-2.5 outline-none">
              <img
                src="/brand/logo.svg"
                alt="MatchMind AI"
                width={36}
                height={36}
                className="brand-mark size-9 shrink-0 rounded-full ring-1 ring-primary/40"
              />
              <div className="min-w-0">
                <p className="font-display text-[10px] font-bold tracking-[0.26em] text-primary">
                  MATCHMIND
                </p>
                <h1 className="truncate font-display text-sm font-semibold leading-tight tracking-tight">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5">
              <div
                className="flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/12 px-2.5 py-1"
                title={streak > 0 ? `${streak} day streak` : "Passport XP"}
              >
                {streak > 0 ? (
                  <span className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-live">
                    <Flame className="size-3" />
                    {streak}
                  </span>
                ) : (
                  <span className="size-1.5 rounded-full bg-primary mm-pulse-glow" />
                )}
                <span className="font-mono text-[10px] font-bold text-primary">
                  {xp.toLocaleString()} XP
                </span>
              </div>

              <Link
                to="/stadium"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/12 px-2.5 text-accent transition hover:border-accent/60 hover:bg-accent/18"
                aria-label="Scan venue QR for live drops"
                title="Scan stadium or watch-party QR"
              >
                <QrCode className="size-3.5" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider">Scan</span>
              </Link>

              {wallet.connected ? (
                <button
                  type="button"
                  onClick={() => setWalletDeskOpen(true)}
                  className="grid size-9 place-items-center rounded-full border border-primary/35 bg-primary/12 text-primary"
                  aria-label="Open wallet desk"
                  title="Wallet"
                >
                  <Wallet className="size-3.5" />
                </button>
              ) : null}

              <ConnectWalletButton onOpenWallet={() => setWalletDeskOpen(true)} />
            </div>
          </div>
        </header>
        <main className="flex-1 pb-32">{children}</main>
        <PartnerFooter compact />
        <BottomNav />
        <OnboardingFlow />
        <AutoAgentRunner />
        <WalletDesk open={walletDeskOpen} onOpenChange={setWalletDeskOpen} />
      </div>
    </div>
  );
}
