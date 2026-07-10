import { hasDatabase, LiveDataRequiredError } from "../config/env";
import { maybeOne, one, query } from "../db/postgres";

export type UserProfile = {
  id: string;
  walletPubkey: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  xHandle: string | null;
  farcasterFid: number | null;
  farcasterUsername: string | null;
  farcasterPfpUrl: string | null;
  socialVerifiedAt: string | null;
  joinedAt: string;
};

function requireDatabase(): void {
  if (!hasDatabase()) throw new LiveDataRequiredError();
}

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    walletPubkey: String(row.wallet_pubkey),
    nickname: row.nickname ? String(row.nickname) : null,
    avatar: row.avatar ? String(row.avatar) : null,
    bio: row.bio ? String(row.bio) : null,
    xHandle: row.x_handle ? String(row.x_handle) : null,
    farcasterFid: row.farcaster_fid != null ? Number(row.farcaster_fid) : null,
    farcasterUsername: row.farcaster_username ? String(row.farcaster_username) : null,
    farcasterPfpUrl: row.farcaster_pfp_url ? String(row.farcaster_pfp_url) : null,
    socialVerifiedAt: row.social_verified_at ? String(row.social_verified_at) : null,
    joinedAt: String(row.joined_at),
  };
}

export async function getProfileByWallet(walletPubkey: string): Promise<UserProfile | null> {
  requireDatabase();
  const row = await maybeOne<Record<string, unknown>>(
    `
      select id, wallet_pubkey, nickname, avatar, bio, x_handle,
             farcaster_fid, farcaster_username, farcaster_pfp_url, social_verified_at, joined_at
      from users where wallet_pubkey = $1
    `,
    [walletPubkey],
  );
  return row ? mapProfile(row) : null;
}

export async function updateProfile(
  walletPubkey: string,
  patch: { nickname?: string; bio?: string | null; xHandle?: string | null; avatar?: string },
): Promise<UserProfile | null> {
  requireDatabase();
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  let i = 1;

  if (patch.nickname !== undefined) {
    sets.push(`nickname = $${i++}`);
    values.push(patch.nickname);
  }
  if (patch.bio !== undefined) {
    sets.push(`bio = $${i++}`);
    values.push(patch.bio);
  }
  if (patch.xHandle !== undefined) {
    sets.push(`x_handle = $${i++}`);
    values.push(patch.xHandle);
  }
  if (patch.avatar !== undefined) {
    sets.push(`avatar = $${i++}`);
    values.push(patch.avatar);
  }

  values.push(walletPubkey);
  const row = await maybeOne<Record<string, unknown>>(
    `
      update users set ${sets.join(", ")}
      where wallet_pubkey = $${i}
      returning id, wallet_pubkey, nickname, avatar, bio, x_handle,
                farcaster_fid, farcaster_username, farcaster_pfp_url, social_verified_at, joined_at
    `,
    values,
  );
  return row ? mapProfile(row) : null;
}

export async function linkFarcasterProfile(params: {
  walletPubkey: string;
  fid: number;
  username: string;
  pfpUrl?: string | null;
}): Promise<UserProfile> {
  requireDatabase();

  const existingFid = await maybeOne<{ wallet_pubkey: string }>(
    "select wallet_pubkey from users where farcaster_fid = $1 and wallet_pubkey != $2",
    [params.fid, params.walletPubkey],
  );
  if (existingFid) {
    throw new Error("farcaster_fid_taken");
  }

  const row = await one<Record<string, unknown>>(
    `
      update users set
        farcaster_fid = $1,
        farcaster_username = $2,
        farcaster_pfp_url = $3,
        social_verified_at = now(),
        avatar = coalesce($3, avatar),
        updated_at = now()
      where wallet_pubkey = $4
      returning id, wallet_pubkey, nickname, avatar, bio, x_handle,
                farcaster_fid, farcaster_username, farcaster_pfp_url, social_verified_at, joined_at
    `,
    [params.fid, params.username, params.pfpUrl ?? null, params.walletPubkey],
  );
  return mapProfile(row);
}

export async function unlinkFarcasterProfile(walletPubkey: string): Promise<UserProfile | null> {
  requireDatabase();
  const row = await maybeOne<Record<string, unknown>>(
    `
      update users set
        farcaster_fid = null,
        farcaster_username = null,
        farcaster_pfp_url = null,
        updated_at = now()
      where wallet_pubkey = $1
      returning id, wallet_pubkey, nickname, avatar, bio, x_handle,
                farcaster_fid, farcaster_username, farcaster_pfp_url, social_verified_at, joined_at
    `,
    [walletPubkey],
  );
  return row ? mapProfile(row) : null;
}
