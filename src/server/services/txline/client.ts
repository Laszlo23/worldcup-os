import axios, { type AxiosInstance } from "axios";
import { env } from "../../config/env";
import { loadTxlineCredentials, touchLastSseAt } from "./credentials";

export type SseMessage = {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
};

export type StatValidationProof = {
  fixtureId: number;
  seq: number;
  statKey: number;
  value: number;
  merkleRoot: string;
  proofHash: string;
  signature: string;
  payload: Record<string, unknown>;
};

export function parseSseBlock(block: string): SseMessage | null {
  const message: SseMessage = { data: "" };
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;
    const separatorIndex = rawLine.indexOf(":");
    const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? "" : rawLine.slice(separatorIndex + 1).replace(/^ /, "");
    if (field === "data") message.data += `${value}\n`;
    if (field === "event") message.event = value;
    if (field === "id") message.id = value;
    if (field === "retry") message.retry = Number(value);
  }
  message.data = message.data.replace(/\n$/, "");
  return message.data || message.event || message.id ? message : null;
}

export async function* readSseMessages(response: Response): AsyncGenerator<SseMessage> {
  if (!response.body) throw new Error("Stream response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separator = buffer.match(/\r?\n\r?\n/);
      while (separator?.index !== undefined) {
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        const message = parseSseBlock(block);
        if (message) yield message;
        separator = buffer.match(/\r?\n\r?\n/);
      }
    }
    buffer += decoder.decode();
    const message = parseSseBlock(buffer);
    if (message) yield message;
  } finally {
    reader.releaseLock();
  }
}

export function parseSseData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function bytesToHex(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const hex = value.map((b) => Number(b).toString(16).padStart(2, "0")).join("");
  return hex ? `0x${hex}` : "";
}

export function parseStatValidationResponse(
  fixtureId: number,
  seq: number,
  statKey: number,
  data: Record<string, unknown>,
): StatValidationProof {
  const summary = data.summary as Record<string, unknown> | undefined;
  const statProof = Array.isArray(data.statProof) ? (data.statProof as { hash?: number[] }[]) : [];
  const subTreeProof = Array.isArray(data.subTreeProof) ? (data.subTreeProof as { hash?: number[] }[]) : [];
  const nonZeroLeaf = [...statProof, ...subTreeProof].map((p) => p.hash).find((h) => Array.isArray(h) && h.some((b) => b !== 0));
  const leafHash = nonZeroLeaf ?? statProof[statProof.length - 1]?.hash ?? statProof[0]?.hash;
  const statToProve = data.statToProve as Record<string, unknown> | undefined;

  const merkleRoot =
    String(data.merkleRoot ?? data.merkle_root ?? "").trim() ||
    bytesToHex(summary?.eventStatsSubTreeRoot) ||
    bytesToHex(data.eventStatRoot);

  const proofHash =
    String(data.proofHash ?? data.proof_hash ?? data.hash ?? "").trim() || bytesToHex(leafHash);

  const signature =
    String(data.signature ?? "").trim() ||
    (merkleRoot ? `txline-stat:${fixtureId}:${seq}:${statKey}:${merkleRoot.slice(0, 42)}` : "");

  return {
    fixtureId,
    seq,
    statKey,
    value: Number(statToProve?.value ?? data.value ?? data.statValue ?? 0),
    merkleRoot,
    proofHash,
    signature,
    payload: data,
  };
}

export class TxLineClient {
  private http: AxiosInstance;
  private lastPingAt: string | null = null;
  private lastPingOk = false;

  constructor() {
    this.http = axios.create({
      baseURL: `${env.txlineApiOrigin}/api`,
      timeout: 30_000,
      headers: { "Content-Type": "application/json" },
    });
  }

  async ensureAuth(): Promise<{ jwt: string; apiToken: string } | null> {
    const creds = await loadTxlineCredentials();
    if (!creds) return null;
    return { jwt: creds.guestJwt, apiToken: creds.apiToken };
  }

  private async authHeaders(): Promise<Record<string, string> | null> {
    const auth = await this.ensureAuth();
    if (!auth) return null;
    return {
      Authorization: `Bearer ${auth.jwt}`,
      "X-Api-Token": auth.apiToken,
    };
  }

  async getFixturesSnapshot(): Promise<unknown[]> {
    const headers = await this.authHeaders();
    if (!headers) return [];
    const res = await this.http.get("/fixtures/snapshot", { headers });
    this.lastPingAt = new Date().toISOString();
    this.lastPingOk = true;
    return Array.isArray(res.data) ? res.data : (res.data?.fixtures ?? []);
  }

  async getHistoricalScores(fixtureId: number): Promise<unknown[]> {
    const headers = await this.authHeaders();
    if (!headers) return [];
    const res = await this.http.get(`/scores/historical/${fixtureId}`, { headers });
    return Array.isArray(res.data) ? res.data : [];
  }

  /** Live + delayed score state for a fixture (primary feed when SSE is quiet). */
  async getScoresSnapshot(fixtureId: number): Promise<unknown[]> {
    const headers = await this.authHeaders();
    if (!headers) return [];
    try {
      const res = await this.http.get(`/scores/snapshot/${fixtureId}`, { headers });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }

  async getStatValidation(
    fixtureId: number,
    seq: number,
    statKey = 1,
  ): Promise<StatValidationProof | null> {
    const headers = await this.authHeaders();
    if (!headers) return null;
    try {
      const res = await this.http.get("/scores/stat-validation", {
        headers,
        params: { fixtureId, seq, statKey },
      });
      return parseStatValidationResponse(fixtureId, seq, statKey, res.data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  /** @deprecated Use getStatValidation */
  async getValidationProof(matchFixtureId: number): Promise<Record<string, unknown> | null> {
    const proof = await this.getStatValidation(matchFixtureId, 0, 1);
    if (!proof) return null;
    return proof.payload;
  }

  async streamScores(onMessage: (payload: unknown) => Promise<void>): Promise<void> {
    const headers = await this.authHeaders();
    if (!headers) return;
    const res = await fetch(`${env.txlineApiOrigin}/api/scores/stream`, {
      headers: { ...headers, Accept: "text/event-stream", "Cache-Control": "no-cache" },
    });
    if (!res.ok) throw new Error(`Scores stream failed: ${res.status}`);
    for await (const message of readSseMessages(res)) {
      await touchLastSseAt();
      await onMessage(parseSseData(message.data));
    }
  }

  async streamOdds(onMessage: (payload: unknown) => Promise<void>): Promise<void> {
    const headers = await this.authHeaders();
    if (!headers) return;
    const res = await fetch(`${env.txlineApiOrigin}/api/odds/stream`, {
      headers: { ...headers, Accept: "text/event-stream", "Cache-Control": "no-cache" },
    });
    if (!res.ok) throw new Error(`Odds stream failed: ${res.status}`);
    for await (const message of readSseMessages(res)) {
      await touchLastSseAt();
      await onMessage(parseSseData(message.data));
    }
  }

  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "down";
    hasCredentials: boolean;
    serviceLevel: number;
    lastPingAt: string | null;
    lastPingOk: boolean;
    tokenExpiresAt: string | null;
    lastSseAt: string | null;
  }> {
    const creds = await loadTxlineCredentials();
    if (!creds) {
      return {
        status: "down",
        hasCredentials: false,
        serviceLevel: env.txlineServiceLevel,
        lastPingAt: null,
        lastPingOk: false,
        tokenExpiresAt: null,
        lastSseAt: null,
      };
    }

    try {
      await this.getFixturesSnapshot();
    } catch {
      this.lastPingOk = false;
    }

    return {
      status: this.lastPingOk ? "healthy" : "degraded",
      hasCredentials: true,
      serviceLevel: env.txlineServiceLevel,
      lastPingAt: this.lastPingAt,
      lastPingOk: this.lastPingOk,
      tokenExpiresAt: creds.expiresAt,
      lastSseAt: creds.lastSseAt,
    };
  }
}

export const txlineClient = new TxLineClient();
