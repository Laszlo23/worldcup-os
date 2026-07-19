import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Check, MapPin, Loader2, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/matchmind/AppShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useAppStore } from "@/lib/store";
import { apiFetch, ApiError } from "@/lib/api/client";
import { resolveWalletTxFns, submitTransaction } from "@/lib/wallet/signing";
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
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
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
      toast.success("Stadium check-in · +100 XP", {
        description: "Attendance proof anchored on Solana",
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl, "_blank") }
          : undefined,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
      void qc.invalidateQueries({ queryKey: queryKeys.stadium(match.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
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
    <AppShell title="Stadium Check-in" subtitle="Prove attendance on Solana · +100 XP">
      <section className="px-4 pt-5">
        <div className="glass mb-4 rounded-xl p-3 text-xs text-muted-foreground">
          Sign a Solana memo to prove you checked in for this fixture. First check-in awards +100 XP and a stadium sticker
          (once per match).
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border glass px-3 py-2 text-xs">
          <MapPin className="size-3.5 text-primary" />
          <span className="font-mono uppercase tracking-widest text-muted-foreground">
            {match?.stadium ?? "Stadium"} · {match?.stage ?? "Fixture"}
          </span>
        </div>

        <div className="relative mt-5 aspect-square overflow-hidden rounded-3xl glass-strong">
          <div className="absolute inset-6 grid place-items-center rounded-2xl border border-accent/40 bg-background/80">
            <div className="text-center">
              <p className="font-display text-4xl font-bold text-accent">CHECK IN</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Solana memo proof
              </p>
            </div>
          </div>
        </div>

        {!wallet.connected ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">Connect wallet to check in</p>
            <ConnectWalletButton size="default" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void verify()}
            disabled={loading || verified || !signingReady}
            className="mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : verified ? <Check className="size-4" /> : null}
            {verified
              ? "Checked in on-chain"
              : loading
                ? "Signing…"
                : !signingReady
                  ? "Preparing wallet…"
                  : "Check in · +100 XP"}
          </button>
        )}

        <AnimatePresence>
          {verified ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2 text-center text-sm text-primary"
            >
              <p>Attendance proof recorded for this match.</p>
              <Link to="/passport" className="inline-flex items-center gap-1 font-semibold text-accent">
                View passport <ArrowRight className="size-3.5" />
              </Link>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Link to="/" className="mt-6 block text-center text-xs font-semibold text-muted-foreground hover:text-accent">
          ← Back to live match
        </Link>
      </section>
    </AppShell>
  );
}
