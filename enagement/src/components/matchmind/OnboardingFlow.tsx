import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  Users,
  Zap,
  ArrowRight,
  Check,
  KeyRound,
  Loader2,
  Copy,
  Palette,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SOCCER_BACKGROUNDS } from "@/lib/soccer-assets";
import {
  completeOnboarding,
  hasCompletedOnboarding,
  type FollowMode,
} from "@/lib/onboarding";
import { FAN_KIT_META, setFanKit, type FanKit } from "@/lib/fan-kit";
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

const STEPS = [
  { id: "welcome", title: "Lace up.", body: "MatchMind is your live fan deck — on-chain polls, moments, and crew energy." },
  { id: "kit", title: "Pick your kit.", body: "Argentina celeste, Spain rojo-oro, or classic MatchMind. Switch anytime in the header." },
  { id: "wallet", title: "Create your wallet.", body: "Internal MatchMind smart wallet — unlock once with a PIN. Gas is topped up so you can predict on-chain." },
  { id: "follow", title: "Pick your lane.", body: "Ride the terrace majority, copy the AgentX signal, or trust your own read." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function OnboardingFlow() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<FollowMode>("crowd");
  const [kit, setKitLocal] = useState<FanKit>("argentina");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [backupSecret, setBackupSecret] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const connectWallet = useAppStore((s) => s.connectWallet);
  const setWalletTxFns = useAppStore((s) => s.setWalletTxFns);

  useEffect(() => {
    if (!hasCompletedOnboarding()) setOpen(true);
    if (hasSmartWallet()) setWalletReady(true);
  }, []);

  const finish = () => {
    completeOnboarding(mode, kit);
    setOpen(false);
  };

  const stepId: StepId = STEPS[step].id;
  const isLast = step === STEPS.length - 1;
  const hero = SOCCER_BACKGROUNDS.crowd.src;

  const pickKit = (next: FanKit) => {
    setKitLocal(next);
    setFanKit(next);
  };

  const finishWalletSession = async (address: string, isNew: boolean) => {
    const { balance } = await authenticateWallet(address, async (msg) => signSmartWalletMessage(msg));
    setWalletTxFns(smartWalletTxFns());
    connectWallet(address, balance);
    const funded = await fundSessionWallet(isNew ? "onboarding_create" : "onboarding_unlock");
    if (funded?.usdc?.balance != null && funded.usdc.balance > 0) {
      connectWallet(address, funded.usdc.balance);
    }
    setWalletReady(true);
    toast.success("Wallet ready", {
      description: "Gas + test USDC topped up — you can predict on-chain.",
    });
  };

  const createWallet = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (pin.length < 6) throw new Error("Use at least 6 digits");
      if (pin !== confirmPin) throw new Error("PINs do not match");
      const created = await createSmartWallet(pin);
      setBackupSecret(created.secretBase58);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmBackup = async () => {
    if (!backupSecret || busy) return;
    setBusy(true);
    try {
      const address = await unlockSmartWallet(pin);
      await finishWalletSession(address, true);
      setBackupSecret(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const unlockExisting = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const address = await unlockSmartWallet(pin);
      await finishWalletSession(address, false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  };

  const canAdvance = () => {
    if (stepId === "wallet") return walletReady && !backupSecret;
    return true;
  };

  const onNext = () => {
    if (stepId === "kit") setFanKit(kit);
    if (isLast) finish();
    else if (canAdvance()) setStep((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? finish() : undefined)}>
      <DialogContent className="max-w-[min(100vw-1.25rem,26rem)] overflow-hidden border-primary/35 bg-background p-0 sm:rounded-3xl">
        <DialogTitle className="sr-only">MatchMind onboarding</DialogTitle>

        <div className="relative h-40 w-full overflow-hidden">
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 pitch-lines opacity-40" />
          <div className="absolute bottom-4 left-5 right-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
              MatchMind · Onboarding
            </p>
            <p className="mt-1 font-display text-2xl font-bold italic tracking-tight text-glow-primary">
              {kit === "argentina" ? "Albiceleste energy" : kit === "spain" ? "La Roja energy" : "World Cup energy"}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          <div className="mb-4 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={STEPS[i].id}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={STEPS[step].id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="font-display text-xl font-bold italic tracking-tight">{STEPS[step].title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{STEPS[step].body}</p>

              {stepId === "welcome" ? (
                <ul className="mt-4 space-y-2 text-sm text-foreground/90">
                  <li className="flex items-center gap-2">
                    <Zap className="size-3.5 text-primary" />
                    Every prediction settles on Solana via your internal wallet
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="size-3.5 text-accent" />
                    Withdraw USDC anytime from Profile
                  </li>
                </ul>
              ) : null}

              {stepId === "kit" ? (
                <div className="mt-4 grid gap-2">
                  {(Object.keys(FAN_KIT_META) as FanKit[]).map((id) => {
                    const meta = FAN_KIT_META[id];
                    return (
                      <ModeCard
                        key={id}
                        active={kit === id}
                        icon={<Palette className="size-4" />}
                        title={`${meta.flag} · ${meta.label}`}
                        detail={meta.detail}
                        onClick={() => pickKit(id)}
                      />
                    );
                  })}
                </div>
              ) : null}

              {stepId === "wallet" ? (
                <div className="mt-4 space-y-3">
                  {walletReady && !backupSecret ? (
                    <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 text-sm">
                      <p className="font-semibold text-primary">Smart wallet ready</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Unlock once later with your PIN. Predictions sign quietly while unlocked.
                      </p>
                    </div>
                  ) : backupSecret ? (
                    <div className="space-y-2 rounded-2xl border border-accent/35 bg-accent/10 p-3">
                      <p className="text-xs font-semibold">Save this recovery key offline</p>
                      <p className="break-all font-mono text-[10px] leading-relaxed">{backupSecret}</p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
                        onClick={() => {
                          void navigator.clipboard.writeText(backupSecret);
                          toast.success("Copied recovery key");
                        }}
                      >
                        <Copy className="size-3.5" /> Copy
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void confirmBackup()}
                        className="mt-2 flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : "I saved it — continue"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block space-y-1">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          PIN (6+ digits)
                        </span>
                        <input
                          type="password"
                          inputMode="numeric"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background/70 px-3 py-2.5 font-mono text-sm"
                          placeholder="••••••"
                        />
                      </label>
                      {!hasSmartWallet() ? (
                        <label className="block space-y-1">
                          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            Confirm PIN
                          </span>
                          <input
                            type="password"
                            inputMode="numeric"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            className="w-full rounded-xl border border-border bg-background/70 px-3 py-2.5 font-mono text-sm"
                            placeholder="••••••"
                          />
                        </label>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy || pin.length < 6}
                        onClick={() => void (hasSmartWallet() ? unlockExisting() : createWallet())}
                        className="flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <KeyRound className="size-4" />
                        )}
                        {hasSmartWallet() ? "Unlock wallet" : "Create smart wallet"}
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              {stepId === "follow" ? (
                <div className="mt-4 grid gap-2">
                  <ModeCard
                    active={mode === "crowd"}
                    icon={<Users className="size-4" />}
                    title="Follow the Crowd"
                    detail="Lock the terrace majority every time"
                    onClick={() => setMode("crowd")}
                  />
                  <ModeCard
                    active={mode === "agent"}
                    icon={<Bot className="size-4" />}
                    title="Follow the Agent"
                    detail="Copy AgentX live signals into your vote"
                    onClick={() => setMode("agent")}
                  />
                  <ModeCard
                    active={mode === "solo"}
                    icon={<Sparkles className="size-4" />}
                    title="Call it yourself"
                    detail="Pure gut. No co-pilot."
                    onClick={() => setMode("solo")}
                  />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="min-h-[44px] flex-1 rounded-xl border border-border px-3 text-sm font-semibold"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="min-h-[44px] flex-1 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              disabled={!canAdvance()}
              onClick={onNext}
              className="inline-flex min-h-[44px] flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-bold uppercase italic tracking-tight text-primary-foreground disabled:opacity-50"
            >
              {isLast ? "Enter the pitch" : stepId === "wallet" && !walletReady ? "Create wallet first" : "Next"}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  active,
  icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-primary/55 bg-primary/12 shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
          : "border-border bg-card/60 hover:border-accent/35"
      }`}
    >
      <span
        className={`mt-0.5 grid size-9 place-items-center rounded-xl ${
          active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
      </span>
      {active ? <Check className="mt-1 size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}
