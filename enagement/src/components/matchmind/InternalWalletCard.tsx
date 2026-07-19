import { useState } from "react";
import { ArrowUpRight, Copy, KeyRound, Loader2, Lock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SmartWalletDialog } from "@/components/wallet/smart-wallet-dialog";
import {
  getSmartWalletPubkey,
  hasSmartWallet,
  isSmartWalletUnlocked,
  lockSmartWallet,
} from "@/lib/wallet/smart-wallet";
import { withdrawUsdc, withdrawSol } from "@/lib/wallet/withdraw";
import { fundSessionWallet } from "@/lib/wallet/fund-wallet";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { useAppStore } from "@/lib/store";

/** Clear MatchMind internal wallet — unlock once, sign quietly for on-chain predictions. */
export function InternalWalletCard() {
  const mounted = useClientMounted();
  const session = useAppStore((s) => s.wallet);
  const balance = session.balance;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"auto" | "create" | "unlock">("auto");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<"usdc" | "sol">("usdc");
  const [busy, setBusy] = useState(false);

  const exists = mounted && hasSmartWallet();
  const unlocked = exists && isSmartWalletUnlocked();
  const pubkey = exists ? getSmartWalletPubkey() : null;
  const address = pubkey ?? (session.connected ? session.address : null);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const topUpGas = async () => {
    setBusy(true);
    try {
      const funded = await fundSessionWallet("manual_topup");
      if (funded?.sol.dripped) {
        toast.success(`Gas topped up · +${funded.sol.amount.toFixed(3)} SOL`);
      } else if (funded?.sol.error) {
        toast.message(funded.sol.error);
      } else {
        toast.message("Gas balance looks fine");
      }
      if (funded?.usdc?.dripped) {
        toast.success(`+${funded.usdc.amount} USDC test funds`);
        if (funded.usdc.balance != null) {
          useAppStore.getState().connectWallet(session.address, funded.usdc.balance);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!unlocked) {
      toast.error("Unlock wallet first");
      return;
    }
    const amt = Number(amount);
    if (!dest.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter destination and amount");
      return;
    }
    setBusy(true);
    try {
      const result =
        asset === "usdc"
          ? await withdrawUsdc({ destination: dest, amount: amt })
          : await withdrawSol({ destination: dest, amount: amt });
      toast.success("Withdrawal sent", {
        description: `${amt} ${asset.toUpperCase()} → ${dest.slice(0, 4)}…`,
        action: { label: "Explorer", onClick: () => window.open(result.explorerUrl, "_blank") },
      });
      setAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-primary/30 bg-card/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <Wallet className="size-3.5" />
            MatchMind wallet
          </p>
          <h3 className="mt-1 font-display text-lg font-bold italic tracking-tight">Internal smart wallet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlock once with your PIN. Every prediction signs on-chain while unlocked — no extension popups.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold ${
            unlocked
              ? "border-primary/40 bg-primary/15 text-primary"
              : exists
                ? "border-live/40 bg-live/10 text-live"
                : "border-border text-muted-foreground"
          }`}
        >
          {unlocked ? "Unlocked" : exists ? "Locked" : "New"}
        </span>
      </div>

      {address ? (
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-left"
        >
          <span className="truncate font-mono text-[11px] text-foreground/90">
            {address.slice(0, 6)}…{address.slice(-6)}
          </span>
          <Copy className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl border border-border/70 bg-background/40 px-2 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">USDC</p>
          <p className="font-display text-lg font-bold italic tabular-nums text-primary">
            {session.connected ? balance.toFixed(2) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/40 px-2 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Predictions</p>
          <p className="font-display text-sm font-bold italic text-accent">On-chain</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!exists ? (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setMode("create");
              setOpen(true);
            }}
          >
            <KeyRound className="size-3.5" />
            Create wallet
          </Button>
        ) : unlocked ? (
          <>
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
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void topUpGas()}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Top up gas"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setMode("unlock");
              setOpen(true);
            }}
          >
            <KeyRound className="size-3.5" />
            Unlock
          </Button>
        )}
      </div>

      {unlocked ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-border bg-background/40 p-3">
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            <ArrowUpRight className="size-3.5" />
            Withdraw
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1">
            <button
              type="button"
              onClick={() => setAsset("usdc")}
              className={`rounded-lg py-1.5 font-mono text-[10px] font-bold uppercase ${
                asset === "usdc" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              USDC
            </button>
            <button
              type="button"
              onClick={() => setAsset("sol")}
              className={`rounded-lg py-1.5 font-mono text-[10px] font-bold uppercase ${
                asset === "sol" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              SOL
            </button>
          </div>
          <input
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="Destination address"
            className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 font-mono text-xs"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step={asset === "usdc" ? "0.01" : "0.001"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-28 rounded-xl border border-border bg-background/70 px-3 py-2 font-mono text-sm"
            />
            <Button className="flex-1" disabled={busy} onClick={() => void withdraw()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : `Send ${asset.toUpperCase()}`}
            </Button>
          </div>
        </div>
      ) : null}

      <SmartWalletDialog open={open} onOpenChange={setOpen} mode={mode} />
    </section>
  );
}
