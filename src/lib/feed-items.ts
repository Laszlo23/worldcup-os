import type { LiveEvent } from "@/lib/queries/hooks";
import { dedupeOracleFeedEvents, feedEventKeyFromLiveEvent } from "@/lib/live-events";

export type ChatAuthor = {
  walletPubkey: string;
  nickname: string | null;
  avatar: string | null;
  farcasterUsername: string | null;
  farcasterPfpUrl: string | null;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: ChatAuthor;
};

export type FeedItem =
  | {
      kind: "oracle";
      id: string;
      feedKey: string;
      event_type: string;
      title: string;
      body: string;
      created_at: string;
    }
  | {
      kind: "user";
      id: string;
      body: string;
      created_at: string;
      author: ChatAuthor;
    };

export function mergeFeedItems(oracleEvents: LiveEvent[], chatMessages: ChatMessage[]): FeedItem[] {
  const deduped = dedupeOracleFeedEvents(oracleEvents);
  const oracle: FeedItem[] = deduped.map((e) => ({
    kind: "oracle",
    id: e.id,
    feedKey: feedEventKeyFromLiveEvent(e),
    event_type: e.event_type,
    title: e.title,
    body: e.body,
    created_at: e.created_at,
  }));

  const user: FeedItem[] = chatMessages.map((m) => ({
    kind: "user",
    id: m.id,
    body: m.body,
    created_at: m.createdAt,
    author: m.author,
  }));

  return [...oracle, ...user].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function authorLabel(author: ChatAuthor): string {
  if (author.nickname) return author.nickname;
  if (author.farcasterUsername) return `@${author.farcasterUsername}`;
  return `${author.walletPubkey.slice(0, 4)}…${author.walletPubkey.slice(-4)}`;
}

export function authorAvatar(author: ChatAuthor): string | null {
  return author.farcasterPfpUrl ?? author.avatar;
}
