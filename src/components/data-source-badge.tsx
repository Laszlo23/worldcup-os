import { cn } from "@/lib/utils";

type Source = "on-chain" | "txline" | "indexed";

const STYLES: Record<Source, string> = {
  "on-chain": "border-primary/40 bg-primary/10 text-primary",
  txline: "border-accent/40 bg-accent/10 text-accent",
  indexed: "border-border bg-muted/40 text-muted-foreground",
};

const LABELS: Record<Source, string> = {
  "on-chain": "On-chain",
  txline: "TxLINE",
  indexed: "Indexed",
};

export function DataSourceBadge({
  source,
  label,
  className,
}: {
  source: Source;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider",
        STYLES[source],
        className,
      )}
    >
      {label ?? LABELS[source]}
    </span>
  );
}
