import { flagEmojiForCode } from "@/lib/team-flags";

type LiveMatchVideoProps = {
  homeCode: string;
  awayCode: string;
  homeFlag?: string;
  awayFlag?: string;
  live?: boolean;
  minute?: number;
  finals?: boolean;
};

export function LiveMatchVideo({
  homeCode,
  awayCode,
  homeFlag,
  awayFlag,
  live,
  minute,
  finals,
}: LiveMatchVideoProps) {
  const homeEmoji = flagEmojiForCode(homeCode, homeFlag);
  const awayEmoji = flagEmojiForCode(awayCode, awayFlag);

  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl border border-accent/30 bg-black shadow-[0_0_40px_oklch(0.82_0.16_210_/_0.18)]">
      <video
        src="/bgvideo.mp4"
        className="aspect-video w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`Demo live feed ${homeCode} vs ${awayCode}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-background/25" />
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
        {finals ? (
          <span className="rounded-full border border-primary/50 bg-primary/25 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
            World Cup Final
          </span>
        ) : null}
        <span className="rounded-full border border-live/50 bg-live/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-live">
          Demo feed
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-background/70 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-accent backdrop-blur">
            <span className="size-1.5 rounded-full bg-live mm-live-dot" />
            Live {minute != null ? `${minute}'` : ""}
          </span>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-3 pb-3">
        <p className="flex items-center gap-2 font-display text-sm font-bold tracking-tight text-white drop-shadow">
          <span className="text-xl leading-none" aria-hidden>
            {homeEmoji}
          </span>
          {homeCode}
          <span className="text-white/50">vs</span>
          {awayCode}
          <span className="text-xl leading-none" aria-hidden>
            {awayEmoji}
          </span>
        </p>
        <p className="font-mono text-[9px] uppercase tracking-wider text-white/70">Broadcast demo</p>
      </div>
    </div>
  );
}
