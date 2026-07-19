import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Award,
  Flame,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SOCCER_BACKGROUNDS } from "@/lib/soccer-assets";
import {
  completeOnboarding,
  hasCompletedOnboarding,
  type FollowMode,
} from "@/lib/onboarding";
import { getFanKit } from "@/lib/fan-kit";

const STEPS = [
  {
    id: "discover",
    label: "Discover",
    headline: "Every Match Becomes Your Game",
    line: "Predict live moments. Build your football reputation. Compete with fans around the world.",
    bullets: [
      "Call goals, cards, and match twists as they unfold",
      "Feel the crowd — climb with fans worldwide",
      "Make every kickoff count",
    ],
    hero: SOCCER_BACKGROUNDS.powerfulKick.src,
    chips: ["Live predictions", "Crew", "Legendary Moments"],
  },
  {
    id: "identity",
    label: "Identity",
    headline: "Your Football Identity",
    line: "Every prediction, reward, and achievement builds your MatchMind Passport.",
    bullets: [
      "Level up with XP from every smart call",
      "Grow your Human Value Score",
      "Wear a reputation that travels with you",
    ],
    hero: SOCCER_BACKGROUNDS.crowd.src,
    chips: ["Football Passport", "XP", "Human Value Score"],
  },
  {
    id: "rewards",
    label: "Rewards",
    headline: "Earn While You Play",
    line: "Win XP. Unlock rewards. Collect digital football moments.",
    bullets: [
      "Claim legendary goal drops",
      "Complete tasks and trade on the Market",
      "Your progress is secured automatically",
    ],
    hero: SOCCER_BACKGROUNDS.goalCelebration.src,
    chips: ["NFT Drops", "Tasks", "Market"],
  },
  {
    id: "kickoff",
    label: "Kickoff",
    headline: "Ready for Kickoff?",
    line: "The pitch is open. Your crew is waiting.",
    bullets: [] as string[],
    hero: SOCCER_BACKGROUNDS.stadium.src,
    chips: [] as string[],
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const fadeSlide = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export function OnboardingFlow() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const mode: FollowMode = "crowd";

  useEffect(() => {
    if (!hasCompletedOnboarding()) setOpen(true);
  }, []);

  const finish = () => {
    completeOnboarding(mode, getFanKit());
    setOpen(false);
  };

  const stepMeta = STEPS[step]!;
  const stepId: StepId = stepMeta.id;
  const isLast = step === STEPS.length - 1;
  const progress = (step + 1) / STEPS.length;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? finish() : undefined)}>
      <DialogContent className="max-w-[min(100vw-1.1rem,27rem)] overflow-hidden border-white/10 bg-transparent p-0 shadow-[0_32px_80px_-24px_oklch(0_0_0_/_0.85)] sm:rounded-[1.75rem]">
        <DialogTitle className="sr-only">Welcome to MatchMind</DialogTitle>

        <div className="relative overflow-hidden bg-background ambient-orbs">
          {/* Hero */}
          <div className="relative h-[13.5rem] w-full overflow-hidden sm:h-56">
            <AnimatePresence mode="wait">
              <motion.img
                key={stepMeta.hero}
                src={stepMeta.hero}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1.14 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.82_0.16_210_/_0.18),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

            <div className="absolute left-5 right-5 top-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-white/80">
                MatchMind
              </p>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                {step + 1} / {STEPS.length}
              </p>
            </div>

            <div className="absolute bottom-4 left-5 right-5">
              <div className="h-1 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={false}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-2.5 flex justify-between gap-1">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`min-w-0 flex-1 text-left font-mono text-[9px] font-bold uppercase tracking-[0.14em] transition ${
                      i === step
                        ? "text-primary"
                        : i < step
                          ? "text-white/70"
                          : "text-white/35"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative px-5 pb-6 pt-5">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

            <AnimatePresence mode="wait">
              <motion.div key={stepId} {...fadeSlide}>
                <h2 className="font-display text-[1.85rem] font-bold italic leading-[1.05] tracking-tight text-foreground text-glow-primary sm:text-[2.1rem]">
                  {stepMeta.headline}
                </h2>
                <p className="mt-3 max-w-[22rem] text-[15px] leading-snug text-muted-foreground">
                  {stepMeta.line}
                </p>

                {stepId === "identity" ? (
                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <IdentityStat
                      icon={<Zap className="size-4 text-primary" />}
                      label="XP"
                      value="Level up"
                      detail="Every smart call"
                    />
                    <IdentityStat
                      icon={<Award className="size-4 text-accent" />}
                      label="Human Value"
                      value="Your score"
                      detail="Trust & presence"
                    />
                  </div>
                ) : null}

                {stepMeta.bullets.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {stepMeta.bullets.map((b, i) => (
                      <motion.li
                        key={b}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 + i * 0.06, duration: 0.3 }}
                        className="flex items-start gap-3 text-[13px] font-medium leading-snug text-foreground/90"
                      >
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/12 text-primary">
                          {i === 0 ? (
                            <Flame className="size-3" />
                          ) : i === 1 ? (
                            <Users className="size-3" />
                          ) : (
                            <Trophy className="size-3" />
                          )}
                        </span>
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                ) : null}

                {stepMeta.chips.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {stepMeta.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                ) : null}

                {stepId === "kickoff" ? (
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={finish}
                      className="mm-onboard-cta relative flex w-full min-h-[52px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent text-base font-bold uppercase italic tracking-tight text-primary-foreground"
                    >
                      <span className="relative z-10 inline-flex items-center gap-2">
                        Start Playing
                        <ArrowRight className="size-4" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={finish}
                      className="flex w-full min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-muted-foreground transition hover:border-white/20 hover:text-foreground"
                    >
                      Explore first
                    </button>
                    <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-muted-foreground/80">
                      <Sparkles className="size-3 text-accent" />
                      Predict · Belong · Earn · Collect
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={finish}
                      className="min-h-[48px] flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-muted-foreground transition hover:border-white/20 hover:text-foreground"
                    >
                      Explore first
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep((s) => s + 1)}
                      className="mm-onboard-cta inline-flex min-h-[48px] flex-[1.55] items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 text-sm font-bold uppercase italic tracking-tight text-primary-foreground"
                    >
                      Continue
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IdentityStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="glass-strong relative overflow-hidden rounded-2xl p-3.5">
      <div className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative flex items-center gap-2">
        {icon}
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="relative mt-2 font-display text-lg font-bold italic tracking-tight">{value}</p>
      <p className="relative mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}
