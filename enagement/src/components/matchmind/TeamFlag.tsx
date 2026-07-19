import { flagEmojiForCode, kitColorsForCode, normalizeTeamCode } from "@/lib/team-flags";

export function TeamFlag({
  code,
  name,
  flag,
  align = "left",
  size = "md",
}: {
  code: string;
  name: string;
  flag?: string;
  align?: "left" | "right";
  size?: "md" | "lg";
}) {
  const normalized = normalizeTeamCode(code);
  const emoji = flagEmojiForCode(code, flag);
  const kit = kitColorsForCode(code);
  const box = size === "lg" ? "size-14 text-3xl" : "size-12 text-2xl";

  return (
    <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start"}`}>
      <span
        className={`grid ${box} place-items-center rounded-2xl border border-white/20 shadow-[0_0_24px_oklch(0.82_0.16_210_/_0.12)]`}
        style={{
          background: `linear-gradient(145deg, ${kit.from} 0%, ${kit.to} 100%)`,
        }}
        aria-hidden
      >
        <span className="drop-shadow-sm leading-none">{emoji}</span>
      </span>
      <span className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
        {normalized}
      </span>
      <span className="max-w-[5.75rem] text-sm font-semibold leading-tight">{name}</span>
    </div>
  );
}
