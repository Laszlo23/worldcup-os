import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Trophy, Target, Flame, Medal, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SoccerImage } from "@/components/soccer-image";
import { SOCCER_REWARDS } from "@/lib/soccer-assets";

const STATS = [
  { icon: Target, label: "Accuracy", value: "73.2%", color: "text-primary" },
  { icon: Trophy, label: "Prediction Score", value: "8,420", color: "text-accent" },
  { icon: Flame, label: "Winning Streak", value: "7", color: "text-warning" },
  { icon: Medal, label: "Global Ranking", value: "#142", color: "text-gold" },
] as const;

const ACHIEVEMENTS = ["Oracle Insider", "Perfect Bracket", "Settlement Pioneer", "TxLINE Verified"];

const REWARD_ITEMS = Object.values(SOCCER_REWARDS);

export function PassportPreview() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="text-center mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-1">Example passport</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/70 mb-3">Web3 identity</p>
        <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight">Prediction Passport</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
          Every user earns a collectible sports intelligence identity — accuracy, streaks, achievements, and on-chain reputation.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="terminal-panel neon-edge max-w-2xl mx-auto overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border/50 bg-black/40 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Passport ID</span>
          <span className="font-mono text-xs text-primary">0x4a2f…8e91</span>
        </div>
        <div className="p-6 sm:p-8">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-3">Season rewards</div>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {REWARD_ITEMS.map((reward, i) => (
              <motion.div
                key={reward.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group"
              >
                <SoccerImage
                  src={reward.src}
                  alt={reward.alt}
                  overlay="soft"
                  className="aspect-square rounded-xl border border-border/50 group-hover:border-gold/40 transition-colors"
                />
                <div className="mt-2 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-foreground">{reward.label}</div>
                  <div className="font-mono text-[9px] text-gold">{reward.points}</div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-xl p-4 border border-border/50"
              >
                <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{s.label}</div>
                <div className={`text-2xl sm:text-3xl font-display font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</div>
              </motion.div>
            ))}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-3">Achievements</div>
          <div className="flex flex-wrap gap-2">
            {ACHIEVEMENTS.map((a) => (
              <span key={a} className="px-3 py-1.5 rounded-full text-[10px] font-mono border border-accent/30 bg-accent/10 text-accent">
                {a}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="text-center mt-8">
        <Button asChild variant="outline" className="glass gap-2 font-mono text-xs uppercase tracking-wider">
          <Link to="/leaderboard" className="inline-flex items-center gap-2">
            View leaderboard <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
