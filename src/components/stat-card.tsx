import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

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
      <Card className="glass p-5 h-full">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accentClasses[accent]}`} />
        </div>
        <div className="text-3xl font-display font-bold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </Card>
    </motion.div>
  );
}
