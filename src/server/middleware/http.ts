import type { H3Event } from "h3";
import { env, hasDatabase } from "../config/env";
import { maybeOne, query } from "../db/postgres";
import { parseSessionCookie, verifySessionToken } from "../services/session";

export function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export async function readJsonBody<T>(event: H3Event): Promise<T> {
  const req = event.req ?? (event as unknown as Request);
  return (await req.json()) as T;
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
  if (secret === env.workerSecret) return true;
  const auth = getHeader(event, "authorization");
  if (auth === `Bearer ${env.workerSecret}`) return true;
  const querySecret = getQueryParam(event, "secret");
  return querySecret === env.workerSecret;
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
