import { cn } from "@/lib/utils";
import { getSoccerBackground, type SoccerBackdropVariant } from "@/lib/soccer-assets";

type SoccerImageProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  overlay?: "none" | "soft" | "strong" | "left";
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
};

export function SoccerImage({
  src,
  alt,
  className,
  imgClassName,
  overlay = "soft",
  loading = "lazy",
  fetchPriority = "auto",
}: SoccerImageProps) {
  return (
    <div className={cn("relative overflow-hidden bg-black/40", className)}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
      />
      {overlay === "soft" && (
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent" aria-hidden />
      )}
      {overlay === "strong" && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/15"
          aria-hidden
        />
      )}
      {overlay === "left" && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-transparent"
          aria-hidden
        />
      )}
    </div>
  );
}

type SoccerBackdropProps = {
  variant?: SoccerBackdropVariant;
  className?: string;
  /** Landing hero can be slightly more visible */
  intensity?: "subtle" | "hero";
};

export function SoccerBackdrop({ variant = "stadium", className, intensity = "subtle" }: SoccerBackdropProps) {
  const bg = getSoccerBackground(variant);
  const imageOpacity = intensity === "hero" ? "opacity-[0.28]" : "opacity-[0.2]";

  return (
    <div
      className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}
      aria-hidden
    >
      <img
        src={bg.src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("absolute inset-0 h-full w-full scale-110 object-cover object-center", imageOpacity)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/92 via-background/84 to-background/90" />
      <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-transparent to-primary/[0.05]" />
      <div className="absolute inset-0 pitch-grid opacity-25" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
