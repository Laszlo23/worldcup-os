export type FanKit = "matchmind" | "argentina" | "spain";

const FAN_KIT_KEY = "matchmind-fan-kit-v1";

export function getFanKit(): FanKit {
  if (typeof window === "undefined") return "matchmind";
  try {
    const v = localStorage.getItem(FAN_KIT_KEY);
    if (v === "argentina" || v === "spain" || v === "matchmind") return v;
  } catch {
    /* ignore */
  }
  return "matchmind";
}

export function setFanKit(kit: FanKit): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAN_KIT_KEY, kit);
    applyFanKit(kit);
    window.dispatchEvent(new CustomEvent("matchmind-fan-kit", { detail: kit }));
  } catch {
    /* ignore */
  }
}

export function applyFanKit(kit: FanKit = getFanKit()): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.kit = kit;
}

export function subscribeFanKit(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("matchmind-fan-kit", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("matchmind-fan-kit", handler);
    window.removeEventListener("storage", handler);
  };
}

export const FAN_KIT_META: Record<
  FanKit,
  { label: string; detail: string; flag: string }
> = {
  matchmind: {
    label: "MatchMind",
    detail: "Pitch green + electric cyan",
    flag: "MM",
  },
  argentina: {
    label: "Argentina",
    detail: "Celeste & white terrace kit",
    flag: "AR",
  },
  spain: {
    label: "Spain",
    detail: "Rojo & oro finals kit",
    flag: "ES",
  },
};
