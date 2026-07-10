import { hasDatabase, LiveDataRequiredError } from "../config/env";
import { maybeOne, one, query } from "../db/postgres";

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    walletPubkey: string;
    nickname: string | null;
    avatar: string | null;
    farcasterUsername: string | null;
    farcasterPfpUrl: string | null;
  };
};

function requireDatabase(): void {
  if (!hasDatabase()) throw new LiveDataRequiredError();
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    body: String(row.body),
    createdAt: String(row.created_at),
    author: {
      walletPubkey: String(row.wallet_pubkey),
      nickname: row.nickname ? String(row.nickname) : null,
      avatar: row.avatar ? String(row.avatar) : null,
      farcasterUsername: row.farcaster_username ? String(row.farcaster_username) : null,
      farcasterPfpUrl: row.farcaster_pfp_url ? String(row.farcaster_pfp_url) : null,
    },
  };
}

export async function listChatMessages(limit: number): Promise<ChatMessage[]> {
  requireDatabase();
  const rows = await query<Record<string, unknown>>(
    `
      select m.id, m.body, m.created_at,
             u.wallet_pubkey, u.nickname, u.avatar, u.farcaster_username, u.farcaster_pfp_url
      from chat_messages m
      join users u on u.id = m.user_id
      order by m.created_at desc
      limit $1
    `,
    [limit],
  );
  return rows.map(mapMessage);
}

export async function createChatMessage(walletPubkey: string, body: string): Promise<ChatMessage> {
  requireDatabase();
  const user = await maybeOne<{ id: string }>("select id from users where wallet_pubkey = $1", [walletPubkey]);
  if (!user) throw new Error("User not found");

  const row = await one<Record<string, unknown>>(
    `
      with inserted as (
        insert into chat_messages (user_id, body)
        values ($1, $2)
        returning id, body, created_at, user_id
      )
      select i.id, i.body, i.created_at,
             u.wallet_pubkey, u.nickname, u.avatar, u.farcaster_username, u.farcaster_pfp_url
      from inserted i
      join users u on u.id = i.user_id
    `,
    [user.id, body],
  );
  return mapMessage(row);
}
