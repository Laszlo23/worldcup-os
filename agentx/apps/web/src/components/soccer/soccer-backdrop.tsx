import { cn } from "@/lib/utils";
import { getSoccerBackground, type SoccerBackdropVariant } from "@/lib/soccer-assets";

type SoccerBackdropProps = {
  variant?: SoccerBackdropVariant;
  className?: string;
  intensity?: "subtle" | "hero";
};

export function SoccerBackdrop({ variant = "playersDark", className, intensity = "subtle" }: SoccerBackdropProps) {
  const bg = getSoccerBackground(variant);
  const imageOpacity = intensity === "hero" ? "opacity-[0.22]" : "opacity-[0.16]";

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)} aria-hidden>
      <img
        src={bg.src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover object-center scale-105", imageOpacity)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/88 to-background/92" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
      <div className="absolute inset-0 pitch-grid opacity-20" />
    </div>
  );
}
