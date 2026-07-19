import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoccerImage } from "@/components/soccer-image";
import { SOCCER_MOMENTS } from "@/lib/soccer-assets";

export function ProofPreview() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-3">Proof explorer</p>
          <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight mb-4">
            From Goal To Certificate
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Every settled match produces a verifiable digital asset — Merkle root, TxLINE signature, and Solana transaction hash. Browse live certificates or trace your own predictions.
          </p>
          <SoccerImage
            src={SOCCER_MOMENTS.save.src}
            alt={SOCCER_MOMENTS.save.alt}
            overlay="soft"
            className="mt-6 aspect-[16/10] rounded-xl border border-border/50 lg:hidden"
          />
          <Button asChild variant="outline" className="glass neon-edge-sm gap-2 font-mono text-xs uppercase tracking-wider mt-6">
            <Link to="/proofs" className="inline-flex items-center gap-2">
              Explore proofs <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, rotateY: -8 }}
          whileInView={{ opacity: 1, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <SoccerImage
            src={SOCCER_MOMENTS.save.src}
            alt={SOCCER_MOMENTS.save.alt}
            overlay="left"
            className="hidden lg:block absolute -inset-4 -z-10 rounded-2xl opacity-40"
          />
          <div className="certificate-panel relative p-6 sm:p-8 overflow-hidden">
            <SoccerImage
              src={SOCCER_MOMENTS.save.src}
              alt=""
              overlay="strong"
              className="absolute inset-0 opacity-25 pointer-events-none"
            />
            <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-1">
            Example certificate
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/70 mb-4">
            Verified Match Certificate
          </div>
          <div className="flex items-center gap-2 text-primary mb-6">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold font-display">Result Verified</span>
          </div>
          <div className="space-y-3 font-mono text-xs sm:text-sm">
            {[
              { k: "Final Score", v: "2 — 1" },
              { k: "Merkle Root", v: "0x7f3a…9c2e" },
              { k: "TxLINE Signature", v: "SL12 · VALID" },
              { k: "Solana Transaction", v: "5Kp9…mX7q" },
              { k: "Settlement", v: "COMPLETE" },
            ].map((row, i) => (
              <motion.div
                key={row.k}
                initial={{ opacity: 0, x: 8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex justify-between gap-4 border-b border-border/40 pb-2"
              >
                <span className="text-muted-foreground shrink-0">{row.k}</span>
                <span className={row.k === "Settlement" ? "text-primary font-semibold" : "text-foreground truncate"}>
                  {row.v}
                </span>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gold/20 text-[10px] text-muted-foreground font-mono text-center tracking-widest">
            WORLD CUP OS · TRUST LAYER PROTOCOL
          </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
