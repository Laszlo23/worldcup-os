import { motion } from "framer-motion";
import { ArrowRight, Brain, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const AGENTX_ARENA_URL = "https://agentx.buildingcultureid.space/arena";

const REASONS = [
  "Possession shift in last 15 minutes",
  "Shots on target trending up",
  "Momentum score +12% vs baseline",
  "Historical head-to-head patterns",
] as const;

export function AiIntelligencePreview() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-border/40">
      <div className="text-center mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-3">Sports intelligence</p>
        <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">AI Sports Intelligence Engine</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Oracle-verified data meets autonomous analysis — predictions grounded in real match truth, not black-box guesses.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto terminal-panel neon-edge overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-black/40">
          <div className="h-9 w-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Brain className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">AI Match Analyst</p>
            <p className="font-display font-semibold text-sm mt-0.5">What happens if France scores next?</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">AI Prediction</p>
              <p className="text-3xl sm:text-4xl font-display font-bold text-primary tabular-nums">73%</p>
              <p className="text-sm text-muted-foreground mt-1">probability of next goal</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">High confidence</span>
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Reasoning</p>
            <ul className="space-y-2">
              {REASONS.map((reason, i) => (
                <motion.li
                  key={reason}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-primary mt-0.5">•</span>
                  {reason}
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Verified by TxLINE</span>
          </div>

          <Button asChild className="w-full bg-gradient-primary text-primary-foreground border-0 font-mono text-xs uppercase tracking-wider gap-2 min-h-[44px]">
            <a href={AGENTX_ARENA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2">
              Explore AgentX Arena <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
