import { useEffect, useState } from "react";
import { Copy, KeyRound, Shield, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authenticateWallet } from "@/lib/wallet/auth";
import { fundSessionWallet } from "@/lib/wallet/fund-wallet";
import {
  createSmartWallet,
  hasSmartWallet,
  signSmartWalletMessage,
  smartWalletTxFns,
  unlockSmartWallet,
} from "@/lib/wallet/smart-wallet";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

function resolveFlow(mode: "auto" | "create" | "unlock"): "create" | "unlock" {
  if (mode === "create" || mode === "unlock") return mode;
  return hasSmartWallet() ? "unlock" : "create";
}

export function SmartWalletDialog({
  open,
  onOpenChange,
  mode = "auto",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "auto" | "create" | "unlock";
}) {
  const connectWallet = useAppStore((s) => s.connectWallet);
  const setWalletTxFns = useAppStore((s) => s.setWalletTxFns);

  const [step, setStep] = useState<"form" | "backup">("form");
  const [flow, setFlow] = useState<"create" | "unlock">(() => resolveFlow(mode));
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [backupSecret, setBackupSecret] = useState<string | null>(null);
  const [pubkey, setPubkey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFlow(resolveFlow(mode));
    setStep("form");
    setPin("");
    setConfirmPin("");
    setBackupSecret(null);
    setPubkey(null);
  }, [open, mode]);

  const finishSession = async (address: string, isNew: boolean) => {
    const { balance } = await authenticateWallet(address, async (msg) => signSmartWalletMessage(msg));
    setWalletTxFns(smartWalletTxFns());
    connectWallet(address, balance);

    const funded = await fundSessionWallet(isNew ? "smart_wallet_create" : "smart_wallet_unlock");
    const solBit =
      funded?.sol.dripped && funded.sol.amount > 0
        ? ` · +${funded.sol.amount.toFixed(3)} SOL`
        : "";
    const usdcBit =
      funded?.usdc?.dripped && funded.usdc.amount > 0 ? ` · +${funded.usdc.amount} USDC` : "";
    const xpBit = funded?.welcomeClaimed && funded.welcomeXp > 0 ? ` · +${funded.welcomeXp} XP` : "";

    if (funded?.usdc?.balance != null && funded.usdc.balance > 0) {
      connectWallet(address, funded.usdc.balance);
    }

    toast.success("Smart wallet ready", {
      description: `Signed in — predictions unlocked${xpBit}${solBit}${usdcBit}.`,
      action:
        funded?.sol.explorerUrl || funded?.usdc?.explorerUrl
          ? {
              label: "Explorer",
              onClick: () =>
                window.open(funded.usdc?.explorerUrl || funded.sol.explorerUrl, "_blank"),
            }
          : undefined,
    });
  };

  const onSubmit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (flow === "create") {
        if (pin.length < 6) throw new Error("Use at least 6 digits");
        if (pin !== confirmPin) throw new Error("PINs do not match");
        const created = await createSmartWallet(pin);
        setPubkey(created.pubkey);
        setBackupSecret(created.secretBase58);
        setStep("backup");
        return;
      }
      const address = await unlockSmartWallet(pin);
      await finishSession(address, false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Smart wallet failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmBackup = async () => {
    if (!pubkey) return;
    setBusy(true);
    try {
      await finishSession(pubkey, true);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100vw-1.25rem,24rem)] border-primary/35 bg-background p-0 sm:rounded-3xl">
        <DialogTitle className="sr-only">MatchMind smart wallet</DialogTitle>
        <div className="kit-stripe border-b border-primary/25 px-5 py-4">
          <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="size-3.5" />
            Instant smart wallet
          </p>
          <h2 className="mt-1 font-display text-xl font-bold italic tracking-tight">
            {step === "backup" ? "Save your key" : flow === "create" ? "Create in-app" : "Unlock wallet"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === "backup"
              ? "Copy this secret once. We only store an encrypted copy on this device."
              : "No extension needed — Solana wallet encrypted with your PIN on this phone."}
          </p>
        </div>

        <div className="space-y-3 px-5 py-4">
          {step === "backup" && backupSecret ? (
            <>
              <div className="rounded-xl border border-live/35 bg-live/10 p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-live">Secret key</p>
                <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-foreground/90">
                  {backupSecret}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-1.5"
                  onClick={async () => {
                    await navigator.clipboard.writeText(backupSecret);
                    toast.success("Secret copied");
                  }}
                >
                  <Copy className="size-3.5" />
                  Copy secret
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Address: <span className="font-mono text-foreground">{pubkey?.slice(0, 8)}…{pubkey?.slice(-6)}</span>
              </p>
              <Button
                type="button"
                className="w-full bg-primary text-primary-foreground"
                disabled={busy}
                onClick={() => void confirmBackup()}
              >
                {busy ? "Signing in…" : "I saved it — enter MatchMind"}
              </Button>
            </>
          ) : (
            <>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PIN (6+ digits)
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm outline-none ring-primary focus:ring-2"
                  placeholder="••••••"
                />
              </label>
              {flow === "create" ? (
                <>
                  <label className="block">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Confirm PIN
                    </span>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm outline-none ring-primary focus:ring-2"
                      placeholder="••••••"
                    />
                  </label>
                  {hasSmartWallet() ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-accent"
                      onClick={() => setFlow("unlock")}
                    >
                      Already have one? Unlock instead
                    </button>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  className="text-xs font-semibold text-accent"
                  onClick={() => setFlow("create")}
                >
                  Create a new smart wallet
                </button>
              )}

              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Shield className="size-3.5 text-primary" />
                  Encrypted on-device with your PIN
                </li>
                <li className="flex items-center gap-2">
                  <KeyRound className="size-3.5 text-accent" />
                  Works for claims, polls, and stadium check-in
                </li>
              </ul>

              <Button
                type="button"
                className="w-full bg-primary text-primary-foreground"
                disabled={busy || pin.length < 6}
                onClick={() => void onSubmit()}
              >
                {busy ? "Working…" : flow === "create" ? "Create smart wallet" : "Unlock & sign in"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
