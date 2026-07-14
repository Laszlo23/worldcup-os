import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Check, MapPin, Loader2 } from "lucide-react";
import { AppShell } from "@/components/matchmind/AppShell";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useAppStore } from "@/lib/store";
import { apiFetch, ApiError } from "@/lib/api/client";
import { resolveWalletTxFns, submitTransaction } from "@/lib/wallet/signing";
import { Transaction, Connection } from "@solana/web3.js";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/hooks";
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
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

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
      toast.success("Stadium proof anchored on Solana", {
        action: res.explorerUrl
          ? { label: "Explorer", onClick: () => window.open(res.explorerUrl, "_blank") }
          : undefined,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.passport });
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
    <AppShell title="Stadium Proof" subtitle="Scan to verify attendance">
      <section className="px-4 pt-5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
          <MapPin className="size-3.5 text-primary" />
          <span className="font-mono uppercase tracking-widest text-muted-foreground">
            {match?.stadium ?? "Stadium"} · {match?.stage ?? "Fixture"}
          </span>
        </div>

        <div className="relative mt-5 aspect-square overflow-hidden rounded-3xl border border-border bg-card">
          <div className="absolute inset-6 grid place-items-center rounded-2xl border border-primary/40 bg-background">
            <QrCode className="size-40 text-primary" strokeWidth={1.2} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void verify()}
          disabled={loading || verified || (wallet.connected && !signingReady)}
          className="mt-6 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : verified ? <Check className="size-4" /> : null}
          {verified ? "Verified on-chain" : loading ? "Signing…" : !signingReady && wallet.connected ? "Preparing wallet…" : "I'm at the Stadium"}
        </button>

        <AnimatePresence>
          {verified ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-center text-sm text-primary"
            >
              Attendance proof recorded — exclusive moment drops unlocked.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </section>
    </AppShell>
  );
}
