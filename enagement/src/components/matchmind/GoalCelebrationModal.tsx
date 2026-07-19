import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SOCCER_BACKGROUNDS, SOCCER_MOMENTS } from "@/lib/soccer-assets";

export type GoalCelebrationPayload = {
  title: string;
  body: string;
  eventKey: string;
};

export function GoalCelebrationModal({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: GoalCelebrationPayload | null;
  onClose: () => void;
}) {
  const imageSrc =
    SOCCER_MOMENTS.slide?.src ??
    SOCCER_MOMENTS.celebration?.src ??
    SOCCER_BACKGROUNDS.goalCelebration.src;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-[min(100vw-1.5rem,28rem)] overflow-hidden border-accent/40 bg-background p-0 sm:rounded-3xl">
        <DialogTitle className="sr-only">Goal celebration</DialogTitle>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur"
          aria-label="Close celebration"
        >
          <X className="size-4" />
        </button>

        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />

          <AnimatePresence>
            {open ? (
              <motion.div
                key={payload?.eventKey ?? "goal"}
                initial={{ opacity: 0, scale: 0.85, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-7 pt-16 text-center"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [0.6, 1.12, 1], opacity: 1 }}
                  transition={{ duration: 0.55 }}
                  className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
                >
                  <Sparkles className="size-3.5" />
                  Goal
                </motion.div>
                <motion.h2
                  initial={{ letterSpacing: "0.4em", opacity: 0 }}
                  animate={{ letterSpacing: "-0.04em", opacity: 1 }}
                  transition={{ delay: 0.08, duration: 0.45 }}
                  className="font-display text-5xl font-black italic tracking-tighter text-glow-primary"
                >
                  GOAL!
                </motion.h2>
                <p className="mt-2 max-w-[18rem] font-display text-lg font-semibold leading-snug">
                  {payload?.title ?? "Goal"}
                </p>
                {payload?.body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{payload.body}</p>
                ) : null}

                <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center gap-2 opacity-80">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: 0, opacity: 0 }}
                      animate={{ y: [-8, 40], opacity: [0, 1, 0] }}
                      transition={{ delay: 0.05 * i, duration: 1.1, repeat: 1 }}
                      className="size-2 rounded-full bg-accent"
                      style={{ marginLeft: (i - 3.5) * 10 }}
                    />
                  ))}
                </div>

                <div className="mt-6 flex w-full flex-col gap-2">
                  <Link
                    to="/moments"
                    onClick={onClose}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground"
                  >
                    Claim moment drop
                  </Link>
                  <Link
                    to="/community"
                    onClick={onClose}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 font-display text-sm font-semibold text-accent"
                  >
                    Cheer in Crew
                  </Link>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
