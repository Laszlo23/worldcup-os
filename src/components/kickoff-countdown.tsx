import { useEffect, useState } from "react";
import { Clock, Radio } from "lucide-react";
import { formatCountdownMs, formatKickoffTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

type KickoffCountdownProps = {
  kickoff: number;
  /** countdown = until kickoff · elapsed = since kickoff · auto = pick based on clock */
  mode?: "countdown" | "elapsed" | "auto";
  variant?: "inline" | "banner";
  className?: string;
};

export function KickoffCountdown({
  kickoff,
  mode = "auto",
  variant = "inline",
  className,
}: KickoffCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msToKickoff = kickoff - now;
  const beforeKickoff = msToKickoff > 0;
  const showCountdown = mode === "countdown" || (mode === "auto" && beforeKickoff);
  const showElapsed = mode === "elapsed" || (mode === "auto" && !beforeKickoff);

  if (mode === "countdown" && !beforeKickoff) return null;
  if (mode === "elapsed" && beforeKickoff) return null;

  const label = !mounted
    ? formatKickoffTime(kickoff)
    : showCountdown
      ? `Kickoff in ${formatCountdownMs(msToKickoff)}`
      : `Started ${formatCountdownMs(-msToKickoff)} ago`;

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-wider tabular-nums",
          showCountdown && "border-primary/35 bg-primary/10 text-primary",
          showElapsed && "border-warning/35 bg-warning/10 text-warning",
          className,
        )}
        suppressHydrationWarning
      >
        {showCountdown ? <Clock className="h-3.5 w-3.5 shrink-0" /> : <Radio className="h-3.5 w-3.5 shrink-0" />}
        <span>{label}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] tabular-nums whitespace-nowrap",
        showCountdown ? "text-primary" : "text-warning",
        className,
      )}
      suppressHydrationWarning
    >
      {showCountdown ? <Clock className="h-3 w-3 shrink-0" /> : <Radio className="h-3 w-3 shrink-0" />}
      {label}
    </span>
  );
}
