import { motion } from "framer-motion";

const STEPS = [
  { id: "txline", label: "TxLINE", sub: "SL12 feed" },
  { id: "events", label: "Events", sub: "SSE stream" },
  { id: "markets", label: "Markets", sub: "Engine" },
  { id: "predictions", label: "Predictions", sub: "Escrow" },
  { id: "solana", label: "Solana", sub: "Anchor" },
  { id: "settlement", label: "Settlement", sub: "Payout" },
];

export function PipelineViz({ activeIndex = 2 }: { activeIndex?: number }) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Data pipeline</div>
      <div className="relative space-y-1">
        {STEPS.map((step, i) => {
          const active = i <= activeIndex;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3"
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-colors ${
                  active ? "bg-primary/20 text-primary border border-primary/40 glow-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</div>
                <div className="text-[10px] text-muted-foreground">{step.sub}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`absolute left-4 w-px h-6 translate-y-8 ${active ? "bg-primary/40" : "bg-border"}`} style={{ top: `${i * 52 + 32}px` }} />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
