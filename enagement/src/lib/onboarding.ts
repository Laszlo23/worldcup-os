import { setFanKit, type FanKit } from "@/lib/fan-kit";

export type FollowMode = "crowd" | "agent" | "solo";
export type { FanKit };

/** Bumped for premium football-first onboarding (emotion over crypto). */
const ONBOARDING_KEY = "matchmind-onboarding-v3";
const FOLLOW_MODE_KEY = "matchmind-follow-mode";
const FAN_BADGES_KEY = "matchmind-fan-badges-v1";

export type FanBadgeId =
  | "boot-laced"
  | "crowd-rider"
  | "agent-ally"
  | "first-whistle"
  | "pulse-junkie";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "done";
  } catch {
    return true;
  }
}

export function completeOnboarding(mode: FollowMode, kit?: FanKit): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_KEY, "done");
    localStorage.setItem(FOLLOW_MODE_KEY, mode);
    if (kit) setFanKit(kit);
    unlockFanBadge("boot-laced");
  } catch {
    /* ignore */
  }
}

export function getFollowMode(): FollowMode {
  if (typeof window === "undefined") return "solo";
  try {
    const v = localStorage.getItem(FOLLOW_MODE_KEY);
    if (v === "crowd" || v === "agent" || v === "solo") return v;
  } catch {
    /* ignore */
  }
  return "solo";
}

export function setFollowMode(mode: FollowMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FOLLOW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function listFanBadges(): FanBadgeId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAN_BADGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FanBadgeId[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function unlockFanBadge(id: FanBadgeId): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = listFanBadges();
    if (current.includes(id)) return false;
    localStorage.setItem(FAN_BADGES_KEY, JSON.stringify([...current, id]));
    window.dispatchEvent(new CustomEvent("matchmind-fan-badges"));
    return true;
  } catch {
    return false;
  }
}

export function subscribeFanBadges(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("matchmind-fan-badges", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("matchmind-fan-badges", handler);
    window.removeEventListener("storage", handler);
  };
}

export const FAN_BADGE_META: Record<
  FanBadgeId,
  { title: string; detail: string; mark: string }
> = {
  "boot-laced": {
    title: "Boots Laced",
    detail: "Joined the MatchMind pitch",
    mark: "MM",
  },
  "crowd-rider": {
    title: "Crowd Rider",
    detail: "Voted with the terrace majority",
    mark: "CR",
  },
  "agent-ally": {
    title: "Agent Ally",
    detail: "Copied an AgentX live signal",
    mark: "AX",
  },
  "first-whistle": {
    title: "First Whistle",
    detail: "Locked your first XP poll",
    mark: "1W",
  },
  "pulse-junkie": {
    title: "Pulse Junkie",
    detail: "Opened Live Hub during a match",
    mark: "PJ",
  },
};
