import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "gold" | "green" | "purple" | "outline" }) {
  const variants = {
    default: "bg-secondary text-foreground",
    gold: "bg-gold/20 text-gold border border-gold/30",
    green: "bg-green/15 text-green border border-green/30",
    purple: "bg-purple/15 text-purple border border-purple/30",
    outline: "border border-border text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)} {...props} />
  );
}
