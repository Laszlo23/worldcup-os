import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";
import { useHealth, useLiveEvents } from "@/lib/queries/hooks";
import { SoccerImage } from "@/components/soccer-image";
import { SOCCER_MOMENTS } from "@/lib/soccer-assets";

export function OraclePreview() {
  const { data: health } = useHealth();
  const { data: liveEvents } = useLiveEvents(undefined, 10_000);
  const [visible, setVisible] = useState(0);

  const txlineHealthy = health?.txline?.status === "healthy";
  const events = (liveEvents ?? []).slice(0, 3).map((e) => ({
    time: new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    type: e.event_type.toUpperCase().replace("_", " "),
    icon: "◈",
    title: e.title,
    detail: e.body,
    meta: "TxLINE · indexed",
    accent: "text-primary",
  }));

  useEffect(() => {
    if (!events.length) return;
    const id = window.setInterval(() => {
      setVisible((v) => (v + 1) % (events.length + 1));
    }, 3200);
    return () => window.clearInterval(id);
  }, [events.length]);

  const shown = events.slice(0, Math.min(visible, events.length));

  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 overflow-hidden">
      <SoccerImage
        src={SOCCER_MOMENTS.topbin.src}
        alt=""
        overlay="none"
        className="absolute -right-20 top-1/2 -translate-y-1/2 w-[min(50vw,520px)] aspect-square opacity-[0.12] pointer-events-none hidden md:block"
      />
      <div className="terminal-panel neon-edge overflow-hidden relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-primary/20 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Radio className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-mono text-xs sm:text-sm tracking-[0.2em] text-primary uppercase">
                TxLINE Oracle Command Center
              </h2>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {txlineHealthy
                  ? `LIVE · SL${health?.txline?.serviceLevel ?? 12}`
                  : "Waiting for TxLINE connection · open /oracle when live"}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 font-mono text-[10px] ${txlineHealthy ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`h-2 w-2 rounded-full ${txlineHealthy ? "bg-primary animate-live-dot" : "bg-muted-foreground"}`} />
            {txlineHealthy ? "TXLINE CONNECTED" : "NO LIVE STREAM"}
          </div>
        </div>

        <div className="p-4 sm:p-6 min-h-[280px] font-mono text-xs sm:text-sm bg-black/30">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-4 border-b border-border/40 pb-2">
            &gt; tail -f /txline/events/live
          </div>
          {events.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              No oracle events yet. Events appear here when TxLINE publishes score updates, settlements, and proofs.
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {shown.map((e) => (
                  <motion.div
                    key={`${e.time}-${e.title}`}
                    initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0.4 }}
                    transition={{ duration: 0.45 }}
                    className="border-l-2 border-primary/50 pl-4 py-1"
                  >
                    <div className="text-muted-foreground tabular-nums">{e.time}</div>
                    <div className={`font-semibold mt-1 ${e.accent}`}>
                      {e.icon} {e.type}
                    </div>
                    <div className="text-foreground mt-1 text-sm sm:text-base font-display font-semibold tracking-tight">
                      {e.title}
                    </div>
                    <div className="text-muted-foreground mt-0.5">{e.detail}</div>
                    <div className="text-[10px] text-primary/80 mt-1">{e.meta}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="text-primary pl-4"
              >
                ▌
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
