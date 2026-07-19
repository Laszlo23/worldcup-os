import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  PartyPopper,
  QrCode,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/matchmind/AppShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useAppStore } from "@/lib/store";
import { apiFetch, ApiError } from "@/lib/api/client";
import { resolveWalletTxFns, submitTransaction } from "@/lib/wallet/signing";
import { ensureOnchainGas } from "@/lib/wallet/fund-wallet";
import { Transaction, Connection } from "@solana/web3.js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useStadiumStatus } from "@/lib/queries/hooks";
import { decodeBase64 } from "@/lib/base64";
import { prefetchMatchFeed } from "@/lib/prefetch-match";
import { useWalletSigningReady } from "@/hooks/use-wallet-signing-ready";

export const Route = createFileRoute("/stadium")({
  loader: async ({ context }) => {
    try {
      await prefetchMatchFeed(context.queryClient);
    } catch {
      // Client retry via queries
    }
  },
  head: () => ({
    meta: [
      { title: "Venue scan — live drops | MatchMind AI" },
      {
        name: "description",
        content:
          "Scan the official MatchMind QR at a stadium station or watch party to unlock live drops and check in on Solana.",
      },
    ],
  }),
  component: StadiumScreen,
});

function StadiumScreen() {
  const { match } = useActiveMatchState();
  const wallet = useAppStore((s) => s.wallet);
  const signingReady = useWalletSigningReady();
  const { data: status } = useStadiumStatus(match?.id, wallet.connected);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (status?.verified) setVerified(true);
  }, [status?.verified]);

  const verify = async () => {
    if (!wallet.connected) {
      toast.error("Connect wallet first");
      return;
    }
    if (!signingReady) {
      toast.message("Wallet preparing", { description: "One moment — then try again." });
      return;
    }
    if (!match) return;
    if (verified) {
      toast.message("Already checked in for this match");
      return;
    }
    setLoading(true);
    try {
      const txFns = await resolveWalletTxFns();
      const connection = new Connection(
        import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
      );
      await ensureOnchainGas();
      const built = await apiFetch<{ transaction: string }>("/api/engagement/stadium/verify", {
        method: "POST",
        body: JSON.stringify({ matchId: match.id, action: "build" }),
      });
      const tx = Transaction.from(decodeBase64(built.transaction));
      const sig = await submitTransaction(tx, txFns, connection);
      const res = await apiFetch<{ explorerUrl?: string }>("/api/engagement/stadium/verify", {
        method: "POST",
        body: JSON.stringify({ matchId: match.id, txSignature: sig }),
      });
      setVerified(true);
      toast.success("Venue check-in · +100 XP", {
        description: "You’re unlocked for live venue drops this match",
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl, "_blank") }
          : undefined,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.stadium(match.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
      void qc.invalidateQueries({ queryKey: queryKeys.moments(match.id) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Session expired — reconnect wallet");
      } else {
        toast.error(err instanceof Error ? err.message : "Verification failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Venue scan" subtitle="Stadium & watch-party QRs" backdropVariant="stadium">
      <section className="px-4 pt-5">
        <div className="rounded-3xl border border-accent/30 bg-accent/10 p-4">
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            <QrCode className="size-3.5" />
            How Scan works
          </p>
          <h2 className="mt-1 font-display text-xl font-bold italic tracking-tight">
            Live drops only from official QRs
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Point your phone at a <span className="font-semibold text-foreground">MatchMind QR</span>{" "}
            at a stadium station or an official watch party. Random internet codes won’t unlock venue
            drops — only those printed (or screened) at the partner location.
          </p>
        </div>

        <ol className="mt-4 space-y-2">
          <Step
            n={1}
            icon={<MapPin className="size-3.5" />}
            title="Find the station"
            body="Look for MatchMind / TxLINE QR boards inside the stadium concourse, fan zones, or partner watch parties."
          />
          <Step
            n={2}
            icon={<ScanLine className="size-3.5" />}
            title="Scan the QR"
            body="Your camera opens this Venue scan screen. That proves you’re at a live drop location for tonight’s fixture."
          />
          <Step
            n={3}
            icon={<Sparkles className="size-3.5" />}
            title="Check in on-chain"
            body="Sign once for +100 XP and a stadium sticker. Then exclusive live drops can land in your Album while the match runs."
          />
        </ol>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <MapPin className="size-4 text-primary" />
            <p className="mt-2 text-xs font-semibold">Stadium stations</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Concourse kiosks & partner gates with MatchMind QR.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3">
            <PartyPopper className="size-4 text-accent" />
            <p className="mt-2 text-xs font-semibold">Watch parties</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Official host screens — same QR unlocks live drops.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 text-xs">
          <MapPin className="size-3.5 shrink-0 text-primary" />
          <span className="font-mono uppercase tracking-widest text-muted-foreground">
            {match?.stadium ?? "Venue"} · {match?.stage ?? "Fixture"}
          </span>
        </div>

        <div className="relative mt-4 aspect-square overflow-hidden rounded-3xl border border-accent/35 bg-black/35">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_65%)]" />
          <div className="absolute inset-8 rounded-2xl border border-dashed border-accent/50" />
          <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-accent/70 mm-pulse-glow" />
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <ScanLine className="mx-auto size-8 text-accent" />
              <p className="mt-3 font-display text-2xl font-bold italic tracking-tight text-accent">
                Ready to check in
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                After you scan a venue QR (or if you’re already on this page from one), confirm below
                to unlock live drops for this match.
              </p>
            </div>
          </div>
        </div>

        {!wallet.connected ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to finish venue check-in
            </p>
            <ConnectWalletButton size="default" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void verify()}
            disabled={loading || verified || !signingReady}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : verified ? <Check className="size-4" /> : null}
            {verified
              ? "Checked in · drops unlocked"
              : loading
                ? "Signing…"
                : !signingReady
                  ? "Preparing wallet…"
                  : "Confirm venue check-in · +100 XP"}
          </button>
        )}

        <AnimatePresence>
          {verified ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center text-sm"
            >
              <p className="font-semibold text-primary">You’re in for live venue drops.</p>
              <p className="text-xs text-muted-foreground">
                Keep MatchMind open during the match — exclusive drops appear in Moments when the
                station feed fires.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                <Link to="/moments" className="inline-flex items-center gap-1 font-semibold text-accent">
                  Open drops <ArrowRight className="size-3.5" />
                </Link>
                <Link to="/passport" className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                  Passport <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Tip: if a host shares a MatchMind QR on the big screen, scan that — don’t invent a code.
          Home browsing alone won’t mint venue-only stickers.
        </p>

        <Link
          to="/"
          className="mt-4 block pb-2 text-center text-xs font-semibold text-muted-foreground hover:text-accent"
        >
          ← Back to live match
        </Link>
      </section>
    </AppShell>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3 rounded-2xl border border-border/70 bg-card/50 px-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/12 font-mono text-[11px] font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <span className="text-primary">{icon}</span>
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
