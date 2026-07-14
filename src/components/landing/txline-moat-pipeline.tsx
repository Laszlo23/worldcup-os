import { motion } from "framer-motion";
import { Building2, Coins, FileCheck, Globe2, Radio, ShieldCheck, Stamp, Zap } from "lucide-react";

const MOAT_STEPS = [
  { icon: Building2, label: "Football Match", sub: "Real-world stadium events" },
  { icon: Radio, label: "TxLINE Oracle", sub: "Official match data feed" },
  { icon: FileCheck, label: "Event Data", sub: "Timestamped match signals" },
  { icon: ShieldCheck, label: "Cryptographic Proof", sub: "ZK-ready verification layer", highlight: true },
  { icon: Stamp, label: "Merkle Commitment", sub: "Tamper-evident root" },
  { icon: Zap, label: "Solana Verification", sub: "On-chain attestation" },
  { icon: Coins, label: "Settlement", sub: "Non-custodial escrow release" },
  { icon: Globe2, label: "NFT Certificate", sub: "Verifiable digital asset" },
] as const;

export function TxlineMoatPipeline() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-border/40">
      <div className="text-center mb-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-3">ZK-ready architecture</p>
        <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">
          Every sports event becomes verifiable digital truth
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          TxLINE is the invisible trust engine — cryptographic proof generation, Merkle commitment, and Solana verification without exposing proprietary feed logic.
        </p>
      </div>

      <div className="relative max-w-md mx-auto">
        {MOAT_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isHighlight = "highlight" in step && step.highlight;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="relative flex flex-col items-center"
            >
              <motion.div
                whileInView={
                  isHighlight
                    ? {
                        boxShadow: [
                          "0 0 0px oklch(0.72 0.19 155 / 0%)",
                          "0 0 32px oklch(0.72 0.19 155 / 35%)",
                          "0 0 0px oklch(0.72 0.19 155 / 0%)",
                        ],
                      }
                    : {}
                }
                viewport={{ once: true }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className={`w-full px-5 py-4 text-center rounded-xl border transition-colors ${
                  isHighlight
                    ? "terminal-panel neon-edge border-primary/40 bg-primary/10"
                    : "terminal-panel neon-edge-sm border-border/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${isHighlight ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`font-display font-semibold text-sm sm:text-base ${isHighlight ? "text-primary" : ""}`}>
                    {step.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{step.sub}</span>
              </motion.div>
              {i < MOAT_STEPS.length - 1 && (
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.15, duration: 0.4 }}
                  className="h-6 w-px bg-gradient-to-b from-primary/60 to-accent/40 origin-top my-1"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
