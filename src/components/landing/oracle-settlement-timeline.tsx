import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEMO_EVENT,
  ORACLE_PIPELINE_NODES,
  ORACLE_TERMINAL_LINES,
  ORACLE_TIMELINE_STAGES,
  TIMELINE_STEP_MS,
} from "./oracle-settlement-timeline-data";
import { PROOF_REPLAY_TIMESTAMPS, PROOF_REPLAY_TIMESTAMP_HIGHLIGHT } from "./proof-engine-data";

const TXLINE_DOCS_URL = "https://txline-docs.txodds.com/";

function DataParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    top: `${8 + (i * 17) % 84}%`,
    delay: (i * 0.35) % 4,
    duration: 3.2 + (i % 5) * 0.4,
    size: i % 3 === 0 ? 3 : 2,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/60"
          style={{ top: p.top, left: "-2%", width: p.size, height: p.size }}
          animate={{ left: ["-2%", "102%"], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/8 to-transparent"
        animate={{ left: ["-33%", "133%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function TypingTerminal({ active }: { active: boolean }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setLineIndex(0);
      setCharIndex(0);
      return;
    }
    const line = ORACLE_TERMINAL_LINES[lineIndex];
    if (!line) return;

    if (charIndex < line.length) {
      const t = window.setTimeout(() => setCharIndex((c) => c + 1), lineIndex === 0 ? 28 : 18);
      return () => window.clearTimeout(t);
    }
    if (lineIndex < ORACLE_TERMINAL_LINES.length - 1) {
      const t = window.setTimeout(() => {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }, 400);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [active, lineIndex, charIndex]);

  return (
    <div className="font-mono text-xs sm:text-sm space-y-2">
      {ORACLE_TERMINAL_LINES.map((line, i) => {
        if (i > lineIndex) return null;
        const text = i < lineIndex ? line : line.slice(0, charIndex);
        const isCheck = line.startsWith("✓");
        return (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={isCheck ? "text-primary" : "text-muted-foreground"}
          >
            {text}
            {i === lineIndex && charIndex < line.length && (
              <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} className="text-primary">
                ▌
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function MerkleTreeViz({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center py-2">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={active ? { opacity: 1, scale: 1 } : { opacity: 0.3, scale: 0.9 }}
        className="font-mono text-[10px] uppercase tracking-widest text-accent mb-4"
      >
        Merkle Tree
      </motion.div>
      <div className="relative w-full max-w-[220px] h-[120px]">
        <motion.div
          className="absolute left-1/2 top-0 -translate-x-1/2 px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-[10px] font-mono text-primary"
          animate={active ? { boxShadow: ["0 0 0px oklch(0.72 0.19 155 / 0%)", "0 0 20px oklch(0.72 0.19 155 / 40%)", "0 0 0px oklch(0.72 0.19 155 / 0%)"] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ROOT
        </motion.div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 120" fill="none">
          <motion.line x1="110" y1="28" x2="60" y2="58" stroke="oklch(0.72 0.19 155 / 50%)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={active ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 0.6, delay: 0.2 }} />
          <motion.line x1="110" y1="28" x2="160" y2="58" stroke="oklch(0.58 0.24 300 / 50%)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={active ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 0.6, delay: 0.35 }} />
          <motion.line x1="60" y1="72" x2="60" y2="58" stroke="oklch(0.72 0.19 155 / 30%)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={active ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 0.4, delay: 0.5 }} />
          <motion.line x1="160" y1="72" x2="160" y2="58" stroke="oklch(0.58 0.24 300 / 30%)" strokeWidth="1"
            initial={{ pathLength: 0 }} animate={active ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 0.4, delay: 0.5 }} />
        </svg>
        <motion.div
          className="absolute left-[60px] top-[72px] -translate-x-1/2 px-2 py-1 rounded border border-primary/30 bg-black/40 text-[9px] font-mono text-primary/90"
          initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 0.7 }}
        >
          EVENT
        </motion.div>
        <motion.div
          className="absolute left-[160px] top-[72px] -translate-x-1/2 px-2 py-1 rounded border border-accent/30 bg-black/40 text-[9px] font-mono text-accent/90"
          initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : { opacity: 0 }} transition={{ delay: 0.85 }}
        >
          HASH
        </motion.div>
      </div>
      <motion.p
        className="mt-3 font-mono text-xs text-muted-foreground tabular-nums"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1 }}
      >
        {DEMO_EVENT.merkleRoot}
      </motion.p>
    </div>
  );
}

function StageContent({ stageIndex }: { stageIndex: number }) {
  const stage = ORACLE_TIMELINE_STAGES[stageIndex];
  if (!stage) return null;

  switch (stage.id) {
    case "live-event":
      return (
        <motion.div key="live-event" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive">Live Event</div>
          <div className="flex items-start gap-4">
            <motion.div
              animate={{ scale: [1, 1.12, 1], boxShadow: ["0 0 0 0 oklch(0.72 0.19 155 / 40%)", "0 0 0 12px oklch(0.72 0.19 155 / 0%)", "0 0 0 0 oklch(0.72 0.19 155 / 0%)"] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="h-14 w-14 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center text-2xl shrink-0"
            >
              ⚽
            </motion.div>
            <div>
              <p className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                {DEMO_EVENT.home} {DEMO_EVENT.scoreHome} – {DEMO_EVENT.scoreAway} {DEMO_EVENT.away}
              </p>
              <p className="font-mono text-sm text-primary mt-1">{DEMO_EVENT.eventType} · {DEMO_EVENT.minute}&apos;</p>
              <p className="text-sm text-muted-foreground mt-2">Player detected</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-3 uppercase tracking-wider">
                TxLINE Event ID: <span className="text-foreground">{DEMO_EVENT.eventId}</span>
              </p>
            </div>
          </div>
          <motion.div
            className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary to-transparent origin-left"
            animate={{ scaleX: [0, 1, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      );

    case "oracle-activation":
      return (
        <motion.div key="oracle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">TxLINE Oracle</span>
          </div>
          <div className="terminal-panel neon-edge-sm p-4 sm:p-5 border border-primary/20">
            <TypingTerminal active />
          </div>
        </motion.div>
      );

    case "proof-generation":
      return (
        <motion.div key="proof" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Generating Proof</div>
          <MerkleTreeViz active />
        </motion.div>
      );

    case "signature":
      return (
        <motion.div key="signature" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-center py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">TxLINE Signature</div>
          <motion.div
            animate={{ boxShadow: ["0 0 20px oklch(0.72 0.19 155 / 20%)", "0 0 48px oklch(0.72 0.19 155 / 45%)", "0 0 20px oklch(0.72 0.19 155 / 20%)"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border border-primary/40 bg-primary/5"
          >
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <span className="font-display text-2xl font-bold text-primary tracking-tight">VALID ✓</span>
            <span className="font-mono text-sm text-foreground">{DEMO_EVENT.signatureId}</span>
            <span className="text-xs text-muted-foreground">Cryptographic attestation complete</span>
          </motion.div>
        </motion.div>
      );

    case "settlement":
      return (
        <motion.div key="settlement" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Smart Contract</div>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="w-full max-w-xs terminal-panel neon-edge-sm p-4 text-center border border-primary/25">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Escrow Released</p>
              <p className="font-display text-3xl font-bold text-primary mt-2">{DEMO_EVENT.usdcAmount} USDC</p>
            </div>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-primary text-2xl">
              ↓
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-xs glass neon-edge-sm p-4 flex items-center justify-between gap-3"
            >
              <div className="text-left">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">Winner Wallet</p>
                <p className="font-mono text-sm mt-1">{DEMO_EVENT.winnerWallet}</p>
              </div>
              <Zap className="h-5 w-5 text-accent shrink-0" />
            </motion.div>
          </div>
        </motion.div>
      );

    case "certificate":
      return (
        <motion.div key="certificate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          <div className="certificate-panel p-5 sm:p-6 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Match Certificate Created</p>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-6 w-6 text-gold" />
                <span className="font-display font-semibold">Verified Match NFT</span>
              </div>
              <p className="font-display text-xl font-bold mb-4">
                {DEMO_EVENT.home} {DEMO_EVENT.scoreHome}–{DEMO_EVENT.scoreAway} {DEMO_EVENT.away}
              </p>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Merkle Root</span>
                  <span className="text-foreground truncate">{DEMO_EVENT.merkleRoot}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Settlement</span>
                  <span className="text-primary font-semibold">COMPLETE</span>
                </div>
              </div>
              <Link to="/proofs" className="inline-flex items-center gap-1.5 mt-5 text-xs font-mono uppercase tracking-wider text-primary hover:underline">
                View Proof <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      );

    default: {
      const _exhaustive: never = stage.id;
      return _exhaustive;
    }
  }
}

function PipelineStrip({ activeThrough }: { activeThrough: number }) {
  return (
    <>
      {/* Desktop: horizontal */}
      <div className="hidden lg:flex items-stretch gap-0 overflow-x-auto pb-2 scrollbar-none">
        {ORACLE_PIPELINE_NODES.map((node, i) => {
          const active = i <= activeThrough;
          const current = i === activeThrough;
          return (
            <div key={node.id} className="flex items-center flex-1 min-w-0">
              <motion.div
                animate={current ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`flex-1 min-w-0 px-2 py-3 rounded-lg text-center transition-colors ${
                  active ? "bg-primary/10 border border-primary/30" : "bg-black/20 border border-border/30 opacity-50"
                }`}
              >
                <div className={`text-[9px] font-mono uppercase tracking-wider leading-tight ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {node.label}
                </div>
              </motion.div>
              {i < ORACLE_PIPELINE_NODES.length - 1 && (
                <motion.div
                  className={`w-6 h-px shrink-0 mx-0.5 ${active ? "bg-primary/60" : "bg-border/40"}`}
                  animate={active ? { opacity: [0.4, 1, 0.4] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="lg:hidden flex flex-col gap-1">
        {ORACLE_PIPELINE_NODES.map((node, i) => {
          const active = i <= activeThrough;
          const current = i === activeThrough;
          return (
            <div key={node.id} className="flex items-center gap-3">
              <motion.div
                className={`h-2 w-2 rounded-full shrink-0 ${active ? "bg-primary" : "bg-muted-foreground/30"}`}
                animate={current ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className={`font-mono text-[10px] uppercase tracking-wider ${active ? "text-primary" : "text-muted-foreground/60"}`}>
                {node.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function OracleSettlementTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: false, margin: "-15% 0px" });
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startReplay = useCallback(() => {
    clearTimer();
    setActiveStep(0);
    setPlaying(true);
    timerRef.current = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= ORACLE_TIMELINE_STAGES.length - 1) {
          clearTimer();
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, TIMELINE_STEP_MS);
  }, [clearTimer]);

  useEffect(() => {
    if (inView && !playing && activeStep === 0) {
      startReplay();
    }
  }, [inView, playing, activeStep, startReplay]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const pipelineThrough = ORACLE_TIMELINE_STAGES[activeStep]?.pipelineThrough ?? 0;

  return (
    <section ref={sectionRef} className="relative border-t border-border/40 overflow-hidden">
      <div className="absolute inset-0 pitch-grid opacity-40 pointer-events-none" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative">
        <div className="text-center mb-10 sm:mb-14">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-primary mb-3"
          >
            Proof Replay
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight max-w-4xl mx-auto leading-tight"
          >
            Watch A Goal Become{" "}
            <span className="gradient-text">Truth</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="text-muted-foreground mt-4 max-w-2xl mx-auto text-sm sm:text-base"
          >
            Goal → proof → certificate → settlement. See how a single match event becomes a cryptographically verified on-chain asset in twenty seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.18 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 max-w-4xl mx-auto"
          >
            {PROOF_REPLAY_TIMESTAMPS.map((ts, i) => {
              const highlightThrough = PROOF_REPLAY_TIMESTAMP_HIGHLIGHT[activeStep] ?? 0;
              return (
              <span
                key={ts.at}
                className={`font-mono text-[10px] sm:text-xs uppercase tracking-wider ${
                  i <= highlightThrough ? "text-primary" : "text-muted-foreground/50"
                }`}
              >
                <span className="tabular-nums text-foreground/90">{ts.at}</span> {ts.label}
              </span>
            );
            })}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative glass-strong neon-edge rounded-2xl overflow-hidden"
        >
          <DataParticles />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/8 pointer-events-none" />

          <div className="relative border-b border-primary/15 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-black/50">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${playing ? "bg-primary animate-live-dot" : "bg-muted-foreground"}`} />
              {playing ? "Proof replay live" : "Proof replay complete"}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {activeStep + 1}/{ORACLE_TIMELINE_STAGES.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startReplay}
                className="glass neon-edge-sm font-mono text-[10px] uppercase tracking-wider gap-1.5 h-8"
              >
                <RefreshCw className="h-3 w-3" /> Replay
              </Button>
            </div>
          </div>

          <div className="relative p-4 sm:p-6 lg:p-8">
            <PipelineStrip activeThrough={pipelineThrough} />

            <div className="mt-6 sm:mt-8 min-h-[280px] sm:min-h-[300px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 20, filter: "blur(6px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -20, filter: "blur(6px)" }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="w-full"
                >
                  <StageContent stageIndex={activeStep} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-1 rounded-full bg-border/40 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent"
                animate={{ width: `${((activeStep + 1) / ORACLE_TIMELINE_STAGES.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-14 sm:mt-16"
        >
          <p className="text-lg sm:text-2xl font-display font-semibold tracking-tight max-w-2xl mx-auto leading-snug">
            Every match becomes a source of truth.
            <br />
            <span className="text-muted-foreground">Every outcome becomes verifiable.</span>
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto bg-gradient-primary text-primary-foreground border-0 font-mono text-xs uppercase tracking-wider gap-2 min-h-[48px] glow-primary">
              <Link to="/replay" className="inline-flex items-center gap-2">
                Run Full Proof Replay <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto glass neon-edge-sm font-mono text-xs uppercase tracking-wider gap-2 min-h-[48px]">
              <Link to="/proofs" className="inline-flex items-center gap-2">
                Explore Proofs <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <a href={TXLINE_DOCS_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="w-full sm:w-auto glass neon-edge-sm font-mono text-xs uppercase tracking-wider gap-2 min-h-[48px]">
                Build with TxLINE <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
