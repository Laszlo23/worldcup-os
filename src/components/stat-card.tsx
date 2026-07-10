import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "accent" | "warning" | "destructive";
}) {
  const accentClasses = {
    primary: "text-primary",
    accent: "text-accent",
    warning: "text-warning",
    destructive: "text-destructive",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="terminal-panel neon-edge-sm p-4 sm:p-5 h-full border-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">{label}</span>
          <Icon className={`h-4 w-4 ${accentClasses[accent]}`} />
        </div>
        <div className="text-2xl sm:text-3xl font-display font-bold tabular-nums tracking-tight">{value}</div>
        {hint && <div className="text-[10px] font-mono text-muted-foreground mt-1.5 uppercase tracking-wider">{hint}</div>}
      </Card>
    </motion.div>
  );
}
