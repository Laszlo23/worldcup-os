import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ShieldCheck } from "lucide-react";
import {
  PROOF_DEMO_EVENT,
  PROOF_ENGINE_STAGES,
  PROOF_ENGINE_STEP_MS,
  PROOF_VERIFICATION_CHECKS,
  type ProofEngineStageId,
} from "./proof-engine-data";

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

function StageContent({ stageId, progress }: { stageId: ProofEngineStageId; progress: number }) {
  switch (stageId) {
    case "live-event":
      return (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-destructive">Live Event</p>
          <p className="font-display text-xl sm:text-2xl font-bold">
            {PROOF_DEMO_EVENT.home} {PROOF_DEMO_EVENT.scoreHome} – {PROOF_DEMO_EVENT.scoreAway} {PROOF_DEMO_EVENT.away}
          </p>
          <p className="font-mono text-sm text-primary">
            ⚽ {PROOF_DEMO_EVENT.eventType} {PROOF_DEMO_EVENT.minute}&apos;
          </p>
        </div>
      );

    case "raw-data":
      return (
        <div className="space-y-3 font-mono text-xs sm:text-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Raw Data</p>
          <div className="terminal-panel neon-edge-sm p-3 space-y-2 bg-black/30">
            <div className="flex justify-between gap-4 border-b border-border/30 pb-2">
              <span className="text-muted-foreground">timestamp</span>
              <span className="text-foreground">{PROOF_DEMO_EVENT.timestamp}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/30 pb-2">
              <span className="text-muted-foreground">player</span>
              <span className="text-foreground">{PROOF_DEMO_EVENT.player}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">source</span>
              <span className="text-primary">{PROOF_DEMO_EVENT.source}</span>
            </div>
          </div>
        </div>
      );

    case "generating":
      return (
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Generating Proof</p>
          <p className="font-display text-lg font-semibold text-accent">Cryptographic proof engine</p>
          <div className="h-2 rounded-full bg-border/50 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {"█".repeat(Math.floor(progress / 10))}
            {"░".repeat(10 - Math.floor(progress / 10))} {progress}%
          </p>
        </div>
      );

    case "verified":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Verified</p>
          </div>
          <ul className="space-y-2">
            {PROOF_VERIFICATION_CHECKS.map((check) => (
              <li key={check} className="flex items-center gap-2 font-mono text-xs sm:text-sm text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                {check}
              </li>
            ))}
          </ul>
        </div>
      );

    case "certificate":
      return (
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">On-Chain Certificate</p>
          <div className="certificate-panel p-4 space-y-2">
            <p className="font-display font-semibold">
              {PROOF_DEMO_EVENT.home} {PROOF_DEMO_EVENT.scoreHome}–{PROOF_DEMO_EVENT.scoreAway} {PROOF_DEMO_EVENT.away}
            </p>
            <div className="flex justify-between gap-4 font-mono text-xs border-t border-border/40 pt-2">
              <span className="text-muted-foreground">Solana TX</span>
              <span className="text-primary">{PROOF_DEMO_EVENT.solanaTx}</span>
            </div>
            <div className="flex justify-between gap-4 font-mono text-xs">
              <span className="text-muted-foreground">Merkle Root</span>
              <span className="text-foreground truncate">{PROOF_DEMO_EVENT.merkleRoot}</span>
            </div>
          </div>
        </div>
      );

    default: {
      const _exhaustive: never = stageId;
      return _exhaustive;
    }
  }
}

export function TxlineProofEngine() {
  const reducedMotion = usePrefersReducedMotion();
  const finalStep = PROOF_ENGINE_STAGES.length - 1;
  const [step, setStep] = useState(reducedMotion ? finalStep : 0);
  const [progress, setProgress] = useState(reducedMotion ? 100 : 0);

  const currentStage = PROOF_ENGINE_STAGES[step] ?? PROOF_ENGINE_STAGES[finalStep]!;

  useEffect(() => {
    if (reducedMotion) {
      setStep(finalStep);
      setProgress(100);
      return;
    }

    const id = window.setInterval(() => {
      setStep((s) => {
        const next = s >= finalStep ? 0 : s + 1;
        if (next === 0) setProgress(0);
        else if (PROOF_ENGINE_STAGES[next]?.id === "generating") setProgress(0);
        else if (PROOF_ENGINE_STAGES[s]?.id === "generating") setProgress(100);
        return next;
      });
    }, PROOF_ENGINE_STEP_MS);

    return () => window.clearInterval(id);
  }, [reducedMotion, finalStep]);

  useEffect(() => {
    if (reducedMotion || currentStage.id !== "generating") return;

    const tick = window.setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 8));
    }, 180);

    return () => window.clearInterval(tick);
  }, [currentStage.id, reducedMotion]);

  return (
    <section className="relative border-t border-border/40 overflow-hidden">
      <div className="absolute inset-0 pitch-grid opacity-25 pointer-events-none" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 relative">
        <div className="text-center mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-3">TxLINE Proof Engine</p>
          <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">
            Every sports event becomes{" "}
            <span className="gradient-text">verifiable digital truth</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Watch a live goal transform from stadium signal to cryptographic proof to on-chain certificate — the invisible trust engine behind World Cup OS.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-lg mx-auto terminal-panel neon-edge rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-primary/20 bg-black/50">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-live-dot" />
              Proof engine active
            </div>
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {step + 1}/{PROOF_ENGINE_STAGES.length}
            </span>
          </div>

          <div className="p-5 sm:p-6 min-h-[240px] flex flex-col bg-black/30">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex-1"
              >
                <StageContent stageId={currentStage.id} progress={progress} />
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 space-y-1">
              {PROOF_ENGINE_STAGES.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider ${
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
                      {s.label}
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
      </div>
    </section>
  );
}
