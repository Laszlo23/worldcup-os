import { cn } from "@/lib/utils";
import { getSoccerBackground, type SoccerBackdropVariant } from "@/lib/soccer-assets";

type SoccerBackdropProps = {
  variant?: SoccerBackdropVariant;
  className?: string;
  intensity?: "subtle" | "hero";
};

export function SoccerBackdrop({ variant = "playersDark", className, intensity = "subtle" }: SoccerBackdropProps) {
  const bg = getSoccerBackground(variant);
  const imageOpacity = intensity === "hero" ? "opacity-[0.34]" : "opacity-[0.22]";

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)} aria-hidden>
      <img
        src={bg.src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("absolute inset-0 h-full w-full scale-110 object-cover object-center", imageOpacity)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-gold/[0.04]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.82_0.145_88_/_0.08),transparent_55%)]" />
      <div className="absolute inset-0 pitch-grid opacity-25" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
