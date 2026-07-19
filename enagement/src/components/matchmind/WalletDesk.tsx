import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Copy,
  History,
  KeyRound,
  Loader2,
  Lock,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SmartWalletDialog } from "@/components/wallet/smart-wallet-dialog";
import { InternalWalletCard } from "@/components/matchmind/InternalWalletCard";
import {
  exportUnlockedSecretBase58,
  getSmartWalletPubkey,
  hasSmartWallet,
  isSmartWalletUnlocked,
  lockSmartWallet,
} from "@/lib/wallet/smart-wallet";
import { fundSessionWallet } from "@/lib/wallet/fund-wallet";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { getClientSolanaNetwork } from "@/lib/wallet/config";

type Tab = "hub" | "history" | "export";

export function WalletDesk({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mounted = useClientMounted();
  const session = useAppStore((s) => s.wallet);
  const [tab, setTab] = useState<Tab>("hub");
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartMode, setSmartMode] = useState<"auto" | "create" | "unlock">("auto");
  const [exportReveal, setExportReveal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlocked = mounted && hasSmartWallet() && isSmartWalletUnlocked();
  const pubkey = mounted && hasSmartWallet() ? getSmartWalletPubkey() : null;
  const address = pubkey ?? (session.connected ? session.address : null);

  useEffect(() => {
    if (!open) {
      setTab("hub");
      setExportReveal(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const { data: txData, isPending: txLoading } = useQuery({
    queryKey: ["walletTx"],
    queryFn: () =>
      apiFetch<{
        transactions: {
          id: string;
          type: string;
          status: string;
          signature: string | null;
          metadata: Record<string, unknown>;
          createdAt: string;
        }[];
      }>("/api/engagement/wallet/transactions"),
    enabled: open && session.connected && tab === "history",
    refetchInterval: 15_000,
  });

  const copyAddr = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  const topUp = async () => {
    setBusy(true);
    try {
      const funded = await fundSessionWallet("wallet_desk");
      if (funded?.sol.dripped) toast.success(`+${funded.sol.amount.toFixed(3)} SOL gas`);
      else if (funded?.sol.error) toast.message(funded.sol.error);
      else toast.message("Gas looks fine");
      if (funded?.usdc?.dripped) toast.success(`+${funded.usdc.amount} USDC`);
    } finally {
      setBusy(false);
    }
  };

  const revealExport = () => {
    if (!unlocked) {
      toast.error("Unlock wallet first");
      setSmartMode("unlock");
      setSmartOpen(true);
      return;
    }
    const secret = exportUnlockedSecretBase58();
    if (!secret) {
      toast.error("Nothing to export");
      return;
    }
    setExportReveal(secret);
  };

  const explorerFor = (sig: string) => {
    const net = getClientSolanaNetwork();
    const cluster = net === "mainnet-beta" ? "" : `?cluster=${net === "devnet" ? "devnet" : net}`;
    return `https://explorer.solana.com/tx/${sig}${cluster}`;
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close wallet desk"
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Wallet Desk"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[480px] outline-none"
            >
              <div className="max-h-[min(90vh,760px)] overflow-hidden rounded-t-[1.75rem] border border-white/10 border-b-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_12%,oklch(0.12_0.03_210)),oklch(0.1_0.03_210))] shadow-[0_-24px_80px_-20px_oklch(0_0_0_/_0.75)]">
                <div className="flex justify-center pt-3">
                  <span className="h-1 w-10 rounded-full bg-white/20" />
                </div>

                <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-2">
                  <div>
                    <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                      <Wallet className="size-3.5" />
                      Wallet Desk
                    </p>
                    <h2 className="mt-0.5 font-display text-xl font-bold italic tracking-tight">
                      MatchMind wallet
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Balance · history · export · withdraw
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 px-5 pb-3">
                  {(
                    [
                      ["hub", "Hub"],
                      ["history", "History"],
                      ["export", "Export"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`rounded-xl px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        tab === id
                          ? "bg-primary text-primary-foreground"
                          : "border border-white/10 text-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="max-h-[min(68vh,560px)] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                  {tab === "hub" ? (
                    <div className="space-y-3">
                      {address ? (
                        <button
                          type="button"
                          onClick={() => void copyAddr()}
                          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-left"
                        >
                          <span className="truncate font-mono text-[11px]">
                            {address.slice(0, 8)}…{address.slice(-8)}
                          </span>
                          <Copy className="size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <p className="font-mono text-[9px] uppercase text-muted-foreground">USDC</p>
                          <p className="font-display text-xl font-bold italic tabular-nums text-primary">
                            {session.connected ? session.balance.toFixed(2) : "—"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                          <p className="font-mono text-[9px] uppercase text-muted-foreground">Status</p>
                          <p className="mt-1 text-sm font-semibold">
                            {unlocked ? "Unlocked" : hasSmartWallet() ? "Locked" : "Create"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!hasSmartWallet() || !unlocked ? (
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                              setSmartMode(hasSmartWallet() ? "unlock" : "create");
                              setSmartOpen(true);
                            }}
                          >
                            <KeyRound className="size-3.5" />
                            {hasSmartWallet() ? "Unlock" : "Create"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => {
                              lockSmartWallet();
                              toast.message("Wallet locked");
                            }}
                          >
                            <Lock className="size-3.5" />
                            Lock
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void topUp()}>
                          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                          Top up gas
                        </Button>
                      </div>
                      {/* Full withdraw / balance card */}
                      <InternalWalletCard />
                    </div>
                  ) : null}

                  {tab === "history" ? (
                    <div className="space-y-2">
                      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                        <History className="size-3.5" />
                        Activity
                      </p>
                      {!session.connected ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">Connect to see history</p>
                      ) : txLoading ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
                      ) : (txData?.transactions.length ?? 0) === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          No transactions yet — vote, claim, or fund to fill the ledger.
                        </p>
                      ) : (
                        <ul className="space-y-2 pb-2">
                          {txData!.transactions.map((tx) => (
                            <li
                              key={tx.id}
                              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold capitalize">
                                    {tx.type.replace(/_/g, " ")}
                                  </p>
                                  <p className="font-mono text-[10px] text-muted-foreground">
                                    {new Date(tx.createdAt).toLocaleString()} · {tx.status}
                                  </p>
                                </div>
                                {tx.signature ? (
                                  <a
                                    href={explorerFor(tx.signature)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent"
                                  >
                                    Tx <ArrowUpRight className="size-3" />
                                  </a>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}

                  {tab === "export" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Export your MatchMind smart wallet secret anytime. Store it offline — anyone with this
                        key controls the funds.
                      </p>
                      <Button className="w-full gap-1.5" onClick={revealExport}>
                        <KeyRound className="size-4" />
                        Reveal recovery key
                      </Button>
                      {exportReveal ? (
                        <div className="rounded-2xl border border-live/40 bg-live/10 p-3">
                          <p className="text-xs font-semibold text-live">Recovery key (base58)</p>
                          <p className="mt-2 break-all font-mono text-[10px] leading-relaxed">{exportReveal}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 gap-1.5"
                            onClick={() => {
                              void navigator.clipboard.writeText(exportReveal);
                              toast.success("Copied recovery key");
                            }}
                          >
                            <Copy className="size-3.5" />
                            Copy
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
      <SmartWalletDialog open={smartOpen} onOpenChange={setSmartOpen} mode={smartMode} />
    </>
  );
}
