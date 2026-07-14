import { env, hasDatabase } from "../../config/env";
import { maybeOne, query } from "../../db/postgres";

export type TxlineCredentials = {
  guestJwt: string;
  apiToken: string;
  expiresAt: string | null;
  lastSseAt: string | null;
};

let memoryCreds: TxlineCredentials | null = null;

export function setMemoryCredentials(creds: TxlineCredentials): void {
  memoryCreds = creds;
}

export async function loadTxlineCredentials(): Promise<TxlineCredentials | null> {
  if (memoryCreds) return memoryCreds;

  if (env.txlineGuestJwt && env.txlineApiToken) {
    memoryCreds = {
      guestJwt: env.txlineGuestJwt,
      apiToken: env.txlineApiToken,
      expiresAt: null,
      lastSseAt: null,
    };
    return memoryCreds;
  }

  if (!hasDatabase()) return null;

  const data = await maybeOne<{ guest_jwt: string; api_token: string; expires_at: string | null; last_sse_at: string | null }>(
    `
      select guest_jwt, api_token, expires_at, last_sse_at
      from txline_credentials
      where service_level = $1
    `,
    [env.txlineServiceLevel],
  );

  if (!data) return null;

  memoryCreds = {
    guestJwt: data.guest_jwt,
    apiToken: data.api_token,
    expiresAt: data.expires_at,
    lastSseAt: data.last_sse_at,
  };
  return memoryCreds;
}

export async function saveTxlineCredentials(params: {
  guestJwt: string;
  apiToken: string;
  expiresAt?: string | null;
  activationTxSig?: string;
}): Promise<void> {
  memoryCreds = {
    guestJwt: params.guestJwt,
    apiToken: params.apiToken,
    expiresAt: params.expiresAt ?? null,
    lastSseAt: null,
  };

  if (!hasDatabase()) return;

  await query(
    `
      insert into txline_credentials (service_level, guest_jwt, api_token, expires_at, activation_tx_sig)
      values ($1, $2, $3, $4, $5)
      on conflict (service_level)
      do update set
        guest_jwt = excluded.guest_jwt,
        api_token = excluded.api_token,
        expires_at = excluded.expires_at,
        activation_tx_sig = excluded.activation_tx_sig,
        updated_at = now()
    `,
    [env.txlineServiceLevel, params.guestJwt, params.apiToken, params.expiresAt ?? null, params.activationTxSig ?? null],
  );
}

export async function getLastSseAtFromDb(): Promise<string | null> {
  if (!hasDatabase()) return memoryCreds?.lastSseAt ?? null;
  const row = await maybeOne<{ last_sse_at: string | null }>(
    "select last_sse_at from txline_credentials where service_level = $1",
    [env.txlineServiceLevel],
  );
  return row?.last_sse_at ?? memoryCreds?.lastSseAt ?? null;
}

export async function touchLastSseAt(): Promise<void> {
  const now = new Date().toISOString();
  if (memoryCreds) memoryCreds.lastSseAt = now;
  if (!hasDatabase()) return;
  await query("update txline_credentials set last_sse_at = $1, updated_at = $1 where service_level = $2", [
    now,
    env.txlineServiceLevel,
  ]);
}
