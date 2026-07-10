import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const STEPS = [
  { label: "TxLINE Oracle", sub: "Real-time match feed" },
  { label: "Verified Match Event", sub: "Cryptographic attestation" },
  { label: "Merkle Proof", sub: "Tamper-evident root" },
  { label: "Solana Smart Contract", sub: "Non-custodial escrow" },
  { label: "Automatic Settlement", sub: "Zero manual intervention" },
  { label: "Winner Wallet", sub: "Instant payout" },
] as const;

export function TrustPipeline() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-3">Trust architecture</p>
        <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">
          From Oracle to Settlement
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Every outcome flows through a verifiable pipeline — no operators, no disputes, no delays.
        </p>
      </div>

      <div className="relative max-w-lg mx-auto">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
            className="relative flex flex-col items-center"
          >
            <motion.div
              whileInView={{ scale: [0.95, 1], boxShadow: ["0 0 0px oklch(0.72 0.19 155 / 0%)", "0 0 24px oklch(0.72 0.19 155 / 25%)"] }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 + 0.2, duration: 0.6 }}
              className="w-full terminal-panel neon-edge-sm px-5 py-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {i === 0 && <ShieldCheck className="h-4 w-4 text-primary" />}
                <span className="font-display font-semibold text-sm sm:text-base">{step.label}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{step.sub}</span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 + 0.3, duration: 0.4 }}
                className="h-8 w-px bg-gradient-to-b from-primary/60 to-accent/40 origin-top my-1"
              />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
