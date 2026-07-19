import { env } from "../config/env";

export type HumanPassportScoreResult = {
  score: number | null;
  passing: boolean;
  checkedAt: string;
  error?: string;
};

/** Fetch Unique Humanity score for an EVM address via Human Passport Stamps API v2. */
export async function fetchHumanPassportScore(evmAddress: string): Promise<HumanPassportScoreResult> {
  const checkedAt = new Date().toISOString();
  const address = evmAddress.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { score: null, passing: false, checkedAt, error: "Invalid EVM address" };
  }

  const apiKey = env.humanPassportApiKey;
  if (!apiKey) {
    return {
      score: null,
      passing: false,
      checkedAt,
      error: "HUMAN_PASSPORT_API_KEY not configured — open passport.human.tech to verify, then save your EVM address",
    };
  }

  const scorerId = env.humanPassportScorerId || "100";
  const url = `https://api.passport.xyz/v2/stamps/${encodeURIComponent(scorerId)}/score/${address}`;
  try {
    const res = await fetch(url, {
      headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        score: null,
        passing: false,
        checkedAt,
        error: `Passport API ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`,
      };
    }
    const data = (await res.json()) as { score?: string | number; passing_score?: boolean };
    const score = data.score != null ? Number(data.score) : null;
    const passing =
      typeof data.passing_score === "boolean"
        ? data.passing_score
        : score != null && score >= env.humanPassportPassScore;
    return { score: Number.isFinite(score) ? score : null, passing, checkedAt };
  } catch (err) {
    return {
      score: null,
      passing: false,
      checkedAt,
      error: err instanceof Error ? err.message : "Passport fetch failed",
    };
  }
}

export function isHumanPassportConfigured(): boolean {
  return Boolean(env.humanPassportApiKey);
}
