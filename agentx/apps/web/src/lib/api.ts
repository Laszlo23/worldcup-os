const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8041";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `API ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () =>
    apiFetch<{
      status: string;
      demoMode: boolean;
      ingestionMode?: string;
      streamsConnected?: boolean;
      lastEventAt?: string | null;
      txlineAuthenticated?: boolean;
    }>("/api/health"),
  liveMatches: (status?: string) =>
    apiFetch<{ matches: import("./types").Match[] }>(`/api/live-matches${status ? `?status=${status}` : ""}`),
  odds: (matchId: string) => apiFetch<{ odds: Record<string, number>; history: unknown[] }>(`/api/odds?matchId=${matchId}`),
  signals: (limit = 50) => apiFetch<{ signals: import("./types").Signal[] }>(`/api/signals?limit=${limit}`),
  signal: (id: string) => apiFetch<{ signal: import("./types").Signal }>(`/api/signals/${id}`),
  agents: () => apiFetch<{ agents: import("./types").Agent[] }>("/api/agents"),
  performance: () => apiFetch<import("./types").Performance>("/api/performance"),
  predictions: () => apiFetch<{ predictions: Record<string, unknown>[] }>("/api/predictions"),
  prediction: (id: string) => apiFetch<{ prediction: Record<string, unknown> }>(`/api/predictions/${id}`),
  chat: (message: string, sessionId = "default") =>
    apiFetch<{ reply: string }>("/api/chat", { method: "POST", body: JSON.stringify({ message, sessionId }) }),
  demoTrigger: () => apiFetch<{ triggered: number }>("/api/demo/trigger", { method: "POST" }),
  certificateBuild: (predictionId: string) =>
    apiFetch<{ transaction: string; memo: string }>(`/api/certificates/${predictionId}/build`, { method: "POST" }),
  certificateSubmit: (predictionId: string, txSignature: string) =>
    apiFetch<{ certificate: Record<string, unknown> }>(`/api/certificates/${predictionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ txSignature }),
    }),
};
