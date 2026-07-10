import axios from "axios";
import { env } from "../../config/env";
import { saveTxlineCredentials } from "./credentials";

export function buildActivationMessage(txSig: string, jwt: string, leagues: number[] = []): string {
  return `${txSig}:${leagues.join(",")}:${jwt}`;
}

export async function startGuestSession(): Promise<string> {
  const res = await axios.post(`${env.txlineApiOrigin}/auth/guest/start`);
  const token = res.data?.token ?? res.data?.jwt;
  if (!token) throw new Error("TxLINE guest session failed");
  return token as string;
}

export async function activateApiToken(params: {
  txSig: string;
  walletSignature: string;
  guestJwt?: string;
}): Promise<{ apiToken: string; guestJwt: string; expiresAt: string | null }> {
  const guestJwt = params.guestJwt ?? (await startGuestSession());
  const leagues: number[] = [];

  const res = await axios.post(
    `${env.txlineApiOrigin}/api/token/activate`,
    {
      txSig: params.txSig,
      walletSignature: params.walletSignature,
      leagues,
    },
    {
      headers: {
        Authorization: `Bearer ${guestJwt}`,
        "Content-Type": "application/json",
      },
    },
  );

  const apiToken = res.data?.apiToken ?? res.data?.token ?? res.data?.api_token;
  if (!apiToken) throw new Error("TxLINE activation did not return api token");

  const expiresAt = (res.data?.expiresAt ?? res.data?.expires_at ?? null) as string | null;

  await saveTxlineCredentials({
    guestJwt,
    apiToken,
    expiresAt,
    activationTxSig: params.txSig,
  });

  return { apiToken, guestJwt, expiresAt };
}
