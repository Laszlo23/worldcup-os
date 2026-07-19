import { useSyncExternalStore } from "react";
import { Palette } from "lucide-react";
import { FAN_KIT_META, getFanKit, setFanKit, subscribeFanKit, type FanKit } from "@/lib/fan-kit";

function kitSnapshot() {
  return getFanKit();
}

/** Compact style switcher — Argentina / Spain / MatchMind. */
export function KitSwitcher({ compact = false }: { compact?: boolean }) {
  const kit = useSyncExternalStore(subscribeFanKit, kitSnapshot, () => "matchmind" as FanKit);

  return (
    <div
      className={
        compact
          ? "flex items-center gap-1"
          : "rounded-2xl border border-border bg-card/70 p-3"
      }
    >
      {!compact ? (
        <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Palette className="size-3.5" />
          Kit style
        </p>
      ) : null}
      <div className={`flex ${compact ? "gap-0.5" : "grid grid-cols-3 gap-1.5"}`}>
        {(Object.keys(FAN_KIT_META) as FanKit[]).map((id) => {
          const meta = FAN_KIT_META[id];
          const active = kit === id;
          return (
            <button
              key={id}
              type="button"
              title={meta.label}
              onClick={() => setFanKit(id)}
              className={
                compact
                  ? `rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground"
                    }`
                  : `rounded-xl border px-2 py-2 text-left ${
                      active
                        ? "border-primary/50 bg-primary/15"
                        : "border-border bg-background/50 hover:border-primary/30"
                    }`
              }
            >
              {compact ? (
                meta.flag
              ) : (
                <>
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                    {meta.flag}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold">{meta.label}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{meta.detail}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
