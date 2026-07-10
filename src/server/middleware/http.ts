import type { H3Event } from "h3";
import { timingSafeEqual } from "node:crypto";
import { env, hasDatabase } from "../config/env";
import { maybeOne, query } from "../db/postgres";
import { parseSessionCookie, verifySessionToken } from "../services/session";
import { applySecurityHeaders } from "./security";

export function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  const headers = new Headers({ "content-type": "application/json", ...extraHeaders });
  applySecurityHeaders(headers);
  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

const MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readJsonBody<T>(event: H3Event): Promise<T> {
  const req = event.req ?? (event as unknown as Request);
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new Error("Request body too large");
  }
  const text = await req.text();
  if (text.length > MAX_JSON_BODY_BYTES) {
    throw new Error("Request body too large");
  }
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

export function clampQueryLimit(raw: string | undefined, fallback = 50, max = 100): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

export function getQueryParam(event: H3Event, key: string): string | undefined {
  const url = new URL(event.req?.url ?? (event as unknown as Request).url);
  return url.searchParams.get(key) ?? undefined;
}

export function getHeader(event: H3Event, key: string): string | undefined {
  const req = event.req ?? (event as unknown as Request);
  return req.headers.get(key) ?? undefined;
}

export function getClientIp(event: H3Event): string {
  return (
    getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ??
    getHeader(event, "x-real-ip") ??
    "unknown"
  );
}

const rateMap = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(event: H3Event, key: string, limit = 120, windowMs = 60_000): Promise<boolean> {
  const ip = getClientIp(event);
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();

  if (hasDatabase()) {
    try {
      const existing = await maybeOne<{ count: number; reset_at: string }>(
        "select count, reset_at from rate_limits where bucket_key = $1",
        [bucketKey],
      );
      if (!existing || new Date(existing.reset_at).getTime() < now) {
        await query(
          `
            insert into rate_limits (bucket_key, count, reset_at)
            values ($1, 1, $2)
            on conflict (bucket_key)
            do update set count = 1, reset_at = excluded.reset_at
          `,
          [bucketKey, new Date(now + windowMs).toISOString()],
        );
        return true;
      }
      if (existing.count >= limit) return false;
      await query("update rate_limits set count = $2 where bucket_key = $1", [bucketKey, existing.count + 1]);
      return true;
    } catch {
      // fall through to in-memory
    }
  }

  const entry = rateMap.get(bucketKey);
  if (!entry || now > entry.resetAt) {
    rateMap.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function requireWorkerSecret(event: H3Event): boolean {
  const secret = getHeader(event, "x-worker-secret");
  const auth = getHeader(event, "authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  const candidate = secret ?? bearer;
  if (!candidate) return false;
  return safeEqual(candidate, env.workerSecret);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function getRequestHost(event: H3Event): string | undefined {
  if (process.env.NODE_ENV === "production") {
    try {
      return new URL(env.appUrl).host;
    } catch {
      return env.farcasterDomain || undefined;
    }
  }
  const forwarded = getHeader(event, "x-forwarded-host")?.split(",")[0]?.trim();
  const host = getHeader(event, "host")?.split(",")[0]?.trim();
  const resolved = forwarded || host;
  if (resolved && !isInternalHost(resolved)) return resolved;
  try {
    return new URL(env.appUrl).host;
  } catch {
    return resolved || env.farcasterDomain || undefined;
  }
}

function isInternalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith("127.0.0.1") ||
    h.startsWith("localhost") ||
    h.startsWith("0.0.0.0") ||
    h === "[::1]"
  );
}

/** Normalize host for auth domain checks (lowercase, strip default ports). */
export function normalizeAuthHost(host: string): string {
  const h = host.trim().toLowerCase();
  const [hostname, port] = h.split(":");
  if (!port) return h;
  if (port === "443" || port === "80") return hostname;
  return h;
}

export function isRequestSecure(event: H3Event): boolean {
  const proto = getHeader(event, "x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https") return true;
  if (proto === "http") return false;
  try {
    const req = event.req ?? (event as unknown as Request);
    return new URL(req.url).protocol === "https:";
  } catch {
    return env.appUrl.startsWith("https");
  }
}

function collectAllowedHosts(event?: H3Event): Set<string> {
  const hosts = new Set<string>();
  const addHost = (value?: string) => {
    if (!value) return;
    try {
      if (value.includes("://")) {
        hosts.add(new URL(value).host);
      } else {
        hosts.add(value.split(",")[0].trim());
      }
    } catch {
      hosts.add(value.trim());
    }
  };

  addHost(getRequestHost(event));
  addHost(env.appUrl);
  addHost(env.farcasterDomain);
  for (const origin of env.allowedOrigins) addHost(origin);

  if (process.env.NODE_ENV !== "production") {
    addHost("localhost:5173");
    addHost("localhost:3017");
    addHost("127.0.0.1:5173");
    addHost("127.0.0.1:3017");
  }
  return hosts;
}

function allowedMutationOrigins(event?: H3Event): Set<string> {
  const origins = new Set<string>();
  const add = (url: string) => {
    try {
      const parsed = new URL(url);
      origins.add(`${parsed.protocol}//${parsed.host}`);
    } catch {
      // ignore invalid URLs
    }
  };
  add(env.appUrl);
  for (const origin of env.allowedOrigins) add(origin);
  for (const host of collectAllowedHosts(event)) {
    add(`https://${host}`);
    add(`http://${host}`);
  }
  if (process.env.NODE_ENV !== "production") {
    add("http://localhost:5173");
    add("http://localhost:3000");
    add("http://127.0.0.1:5173");
    add("http://127.0.0.1:3000");
    add("http://localhost:3017");
    add("http://127.0.0.1:3017");
  }
  return origins;
}

export function isAllowedAuthDomain(domain: string, event: H3Event): boolean {
  const normalized = normalizeAuthHost(domain);
  const allowed = collectAllowedHosts(event);
  if (allowed.has(domain) || allowed.has(normalized)) return true;
  const domainHost = normalized.split(":")[0];
  for (const host of allowed) {
    if (normalizeAuthHost(host).split(":")[0] === domainHost) return true;
  }
  return false;
}

/** Reject cross-site POSTs in production (session cookie protection). */
export function requireMutationOrigin(event: H3Event): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const allowed = allowedMutationOrigins(event);
  const origin = getHeader(event, "origin");
  if (origin && allowed.has(origin)) return true;
  const referer = getHeader(event, "referer");
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (allowed.has(`${parsed.protocol}//${parsed.host}`)) return true;
    } catch {
      return false;
    }
  }
  const host = getRequestHost(event);
  if (host) {
    const site = getHeader(event, "sec-fetch-site");
    if (site === "same-origin" || site === "same-site") {
      if (allowed.has(`https://${host}`) || allowed.has(`http://${host}`)) return true;
      const normalized = normalizeAuthHost(host);
      if (allowed.has(`https://${normalized}`) || allowed.has(`http://${normalized}`)) return true;
    }
    // Some mobile wallets omit Origin on fetch; allow when Host matches an allowed app host.
    if (!origin && !referer) {
      for (const candidate of [host, normalizeAuthHost(host)]) {
        if (allowed.has(`https://${candidate}`) || allowed.has(`http://${candidate}`)) return true;
      }
    }
  }
  return false;
}

export async function getSessionWallet(event: H3Event): Promise<string | undefined> {
  const cookieHeader = getHeader(event, "cookie");
  const token = parseSessionCookie(cookieHeader);
  if (token) {
    const wallet = await verifySessionToken(token);
    if (wallet) return wallet;
  }
  return undefined;
}

export async function requireSession(event: H3Event): Promise<string | Response> {
  const wallet = await getSessionWallet(event);
  if (!wallet) return errorResponse("Authentication required", 401);
  return wallet;
}

export function requireAdmin(wallet: string): boolean {
  return env.adminWalletAllowlist.length > 0 && env.adminWalletAllowlist.includes(wallet);
}
