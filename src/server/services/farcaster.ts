import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { env } from "../config/env";

export type FarcasterAuthPayload = {
  message: string;
  signature: string;
  nonce: string;
};

export type VerifiedFarcasterUser = {
  fid: number;
  username: string;
  pfpUrl: string | null;
};

const appClient = createAppClient({
  ethereum: viemConnector(),
});

export async function verifyFarcasterSignIn(payload: FarcasterAuthPayload): Promise<VerifiedFarcasterUser | null> {
  try {
    const verify = await appClient.verifySignInMessage({
      message: payload.message,
      signature: payload.signature as `0x${string}`,
      nonce: payload.nonce,
      domain: env.farcasterDomain,
    });

    if (!verify.success || !verify.fid) return null;

    const fid = Number(verify.fid);
    let username = `fid:${fid}`;
    let pfpUrl: string | null = null;

    if (env.neynarApiKey) {
      const user = await fetchNeynarUser(fid);
      if (user) {
        username = user.username;
        pfpUrl = user.pfpUrl;
      }
    }

    return { fid, username, pfpUrl };
  } catch {
    return null;
  }
}

async function fetchNeynarUser(fid: number): Promise<{ username: string; pfpUrl: string | null } | null> {
  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
      headers: { accept: "application/json", api_key: env.neynarApiKey },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: { username?: string; pfp_url?: string }[] };
    const user = data.users?.[0];
    if (!user?.username) return null;
    return { username: user.username, pfpUrl: user.pfp_url ?? null };
  } catch {
    return null;
  }
}
