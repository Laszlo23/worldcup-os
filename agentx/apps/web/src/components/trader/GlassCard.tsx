"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn("glass rounded-2xl p-4", className)}
    >
      {children}
    </motion.div>
  );
}
