import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { DEMO_EVENT } from "./oracle-settlement-timeline-data";

const HERO_FLOW_STEPS = [
  {
    id: "live",
    badge: "Live Match Event",
    title: "⚽ Goal Detected",
    detail: `${DEMO_EVENT.home} ${DEMO_EVENT.scoreHome} – ${DEMO_EVENT.scoreAway} ${DEMO_EVENT.away}`,
    accent: "text-destructive",
  },
  {
    id: "oracle",
    badge: "0.4s",
    title: "TxLINE Oracle Verified",
    detail: `Event ${DEMO_EVENT.eventId} · ${DEMO_EVENT.minute}'`,
    accent: "text-primary",
  },
  {
    id: "proof",
    badge: "0.6s",
    title: "Cryptographic Proof Generated",
    detail: "Proof engine attestation complete",
    accent: "text-accent",
  },
  {
    id: "merkle",
    badge: "0.8s",
    title: "Merkle Commitment",
    detail: DEMO_EVENT.merkleRoot,
    accent: "text-accent",
  },
  {
    id: "settlement",
    badge: "1.2s",
    title: "Solana Settlement Complete",
    detail: `${DEMO_EVENT.usdcAmount} USDC released to escrow winners`,
    accent: "text-primary",
  },
  {
    id: "paid",
    badge: "Complete",
    title: "✓ Winner Paid",
    detail: `Wallet ${DEMO_EVENT.winnerWallet}`,
    accent: "text-primary",
  },
] as const;

const STEP_MS = 1400;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function HeroLiveEventFlow() {
  const reducedMotion = usePrefersReducedMotion();
  const finalStep = HERO_FLOW_STEPS.length - 1;
  const [step, setStep] = useState(reducedMotion ? finalStep : 0);

  useEffect(() => {
    if (reducedMotion) {
      setStep(finalStep);
      return;
    }

    const id = window.setInterval(() => {
      setStep((s) => (s >= finalStep ? 0 : s + 1));
    }, STEP_MS);

    return () => window.clearInterval(id);
  }, [reducedMotion, finalStep]);

  const current = HERO_FLOW_STEPS[step] ?? HERO_FLOW_STEPS[finalStep]!;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="terminal-panel neon-edge-sm rounded-2xl overflow-hidden shadow-2xl border border-primary/25 bg-black/50 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-primary/20 bg-black/40">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary">
          <span className="h-2 w-2 rounded-full bg-primary animate-live-dot" />
          Live event simulation
        </div>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {step + 1}/{HERO_FLOW_STEPS.length}
        </span>
      </div>

      <div className="p-4 sm:p-5 min-h-[220px] sm:min-h-[260px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.35 }}
            className="flex-1"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {current.badge}
            </p>
            <h3 className={`font-display text-lg sm:text-xl font-bold tracking-tight ${current.accent}`}>
              {current.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground font-mono leading-relaxed">{current.detail}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 space-y-1">
          {HERO_FLOW_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider transition-opacity ${
                  done || active ? "opacity-100" : "opacity-35"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                ) : active ? (
                  <span className="h-2 w-2 rounded-full bg-primary animate-live-dot shrink-0" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                )}
                <span className={active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {step < finalStep && !reducedMotion && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4], y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="flex justify-center mt-3 text-primary/70"
            aria-hidden
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
