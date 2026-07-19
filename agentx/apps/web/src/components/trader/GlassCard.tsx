"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  delay = 0,
  strong = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  strong?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(strong ? "glass-strong" : "glass", "rounded-2xl p-4", className)}
    >
      {children}
    </motion.div>
  );
}
