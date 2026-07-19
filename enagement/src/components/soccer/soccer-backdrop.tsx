import { cn } from "@/lib/utils";
import { getSoccerBackground, type SoccerBackdropVariant } from "@/lib/soccer-assets";

type SoccerBackdropProps = {
  variant?: SoccerBackdropVariant;
  className?: string;
  intensity?: "subtle" | "hero";
};

export function SoccerBackdrop({ variant = "pitch", className, intensity = "subtle" }: SoccerBackdropProps) {
  const bg = getSoccerBackground(variant);
  const imageOpacity = intensity === "hero" ? "opacity-[0.3]" : "opacity-[0.2]";

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)} aria-hidden>
      <img
        src={bg.src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("absolute inset-0 h-full w-full scale-110 object-cover object-center", imageOpacity)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/92 via-background/84 to-background/90" />
      <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-transparent to-accent/[0.05]" />
      <div className="absolute inset-0 pitch-grid opacity-25" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
