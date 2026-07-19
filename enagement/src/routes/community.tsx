import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, MessageCircle, Send, Trophy, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/matchmind/AppShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { ReferralCard } from "@/components/matchmind/ReferralCard";
import { Button } from "@/components/ui/button";
import { useActiveMatchState } from "@/lib/use-active-match";
import {
  queryKeys,
  useCommunity,
  useFanMessages,
  useMatches,
  type FanLeaderRow,
  type FanMessage,
} from "@/lib/queries/hooks";
import { useAppStore } from "@/lib/store";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchMatchFeed } from "@/lib/prefetch-match";

export const Route = createFileRoute("/community")({
  loader: async ({ context }) => {
    try {
      await prefetchMatchFeed(context.queryClient);
    } catch {
      // Client can retry.
    }
  },
  component: CommunityScreen,
});

const REACTIONS = ["🔥", "⚽", "😱", "👏", "💚"] as const;
type Tab = "chat" | "board" | "pulse";

function CommunityScreen() {
  const { match: activeMatch } = useActiveMatchState();
  const { data: matches = [] } = useMatches();
  const match = activeMatch ?? matches[0] ?? null;
  const matchId = match?.id;
  const wallet = useAppStore((s) => s.wallet);
  const [tab, setTab] = useState<Tab>("chat");
  const { data: community, isPending } = useCommunity(matchId);
  const { data: messages = [], isPending: messagesLoading } = useFanMessages(matchId);
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    if (!matchId || !draft.trim() || sending) return;
    if (!wallet.connected) {
      setError("Connect your wallet to chat with the crew");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiFetch("/api/engagement/community/messages", {
        method: "POST",
        body: JSON.stringify({ matchId, body: draft.trim() }),
      });
      setDraft("");
      await qc.invalidateQueries({ queryKey: queryKeys.fanMessages(matchId) });
      await qc.invalidateQueries({ queryKey: queryKeys.community(matchId) });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  async function react(emoji: string) {
    if (!matchId) return;
    if (!wallet.connected) {
      setError("Connect wallet to react");
      return;
    }
    setError(null);
    try {
      await apiFetch("/api/engagement/community/react", {
        method: "POST",
        body: JSON.stringify({ matchId, emoji }),
      });
      await qc.invalidateQueries({ queryKey: queryKeys.community(matchId) });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Reaction failed");
    }
  }

  const subtitle = match
    ? `${match.home.code} vs ${match.away.code} · crew room`
    : "Fan crew";

  return (
    <AppShell title="Crew" subtitle={subtitle} backdropVariant="crowd" backdropIntensity="subtle">
      <div className="space-y-4 px-4 pt-4 pb-6">
        <section className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                Live community
              </p>
              <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
                Chat, climb, check in
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                MatchMind is the fan room — not a trading desk. Cheer, react, and race for XP.
              </p>
            </div>
            <div className="rounded-full border border-accent/40 bg-background/40 px-3 py-2 text-center">
              <Users className="mx-auto size-4 text-accent" />
              <p className="mt-1 font-mono text-lg font-bold text-accent tabular-nums">
                {community?.crowd.checkedIn ?? 0}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">in stadium</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {REACTIONS.map((emoji) => {
              const count = community?.reactions.find((r) => r.emoji === emoji)?.count ?? 0;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => void react(emoji)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-background/50 px-3 py-1.5 text-sm transition hover:border-accent/50 hover:bg-accent/10"
                >
                  <span>{emoji}</span>
                  <span className="font-mono text-[11px] text-accent">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-1 rounded-full border border-border/70 bg-card/60 p-1">
          {(
            [
              { id: "chat", label: "Chat", icon: MessageCircle },
              { id: "board", label: "Board", icon: Trophy },
              { id: "pulse", label: "Pulse", icon: Users },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                tab === id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {error ? <p className="text-center text-xs text-live">{error}</p> : null}

        {tab === "chat" ? (
          <ChatPanel
            matchId={matchId}
            messages={messages}
            loading={messagesLoading || (!!matchId && isPending && messages.length === 0)}
            draft={draft}
            setDraft={setDraft}
            sending={sending}
            connected={wallet.connected}
            onSend={() => void sendMessage()}
          />
        ) : null}

        {tab === "board" ? (
          <div className="space-y-4">
            <ReferralCard />
            <LeaderboardPanel
              rows={community?.xpLeaderboard ?? []}
              loading={isPending}
              myWallet={wallet.connected ? wallet.address : null}
            />
            <FollowingPanel connected={wallet.connected} />
          </div>
        ) : null}

        {tab === "pulse" ? (
          <PulsePanel
            pulse={community?.pulse ?? []}
            crowd={community?.crowd}
            loading={isPending}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function ChatPanel({
  matchId,
  messages,
  loading,
  draft,
  setDraft,
  sending,
  connected,
  onSend,
}: {
  matchId?: string;
  messages: FanMessage[];
  loading: boolean;
  draft: string;
  setDraft: (v: string) => void;
  sending: boolean;
  connected: boolean;
  onSend: () => void;
}) {
  if (!matchId) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Waiting for an active fixture before the crew chat opens.
      </div>
    );
  }

  const chronological = [...messages].reverse();

  return (
    <section className="overflow-hidden rounded-2xl border border-accent/20 bg-card/70">
      <div className="max-h-[22rem] space-y-2.5 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading crew chat…
          </p>
        ) : chronological.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Be first in the room — drop a take for this match.
          </p>
        ) : (
          chronological.map((m) => (
            <article
              key={m.id}
              className={`rounded-xl border px-3 py-2 ${
                m.author.isAgent
                  ? "border-primary/35 bg-primary/8"
                  : "border-border/50 bg-background/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                  {displayName(m.author.nickname, m.author.wallet)}
                  {m.author.isAgent ? (
                    <span className="rounded-full border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[8px] text-primary">
                      AGENT
                    </span>
                  ) : null}
                </p>
                <time className="font-mono text-[9px] text-muted-foreground">{relTime(m.createdAt)}</time>
              </div>
              <p className="mt-1 text-sm leading-snug text-foreground/95">{m.body}</p>
            </article>
          ))
        )}
      </div>

      <div className="border-t border-border/60 bg-background/50 p-3">
        {connected ? (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Say something to the crew…"
              className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-accent/25 bg-card px-3 py-2 text-sm outline-none ring-accent/40 placeholder:text-muted-foreground focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              disabled={sending || !draft.trim()}
              onClick={onSend}
              aria-label="Send message"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1 text-center">
            <p className="text-xs text-muted-foreground">Connect wallet to join the match chat</p>
            <ConnectWalletButton size="sm" />
          </div>
        )}
      </div>
    </section>
  );
}

function LeaderboardPanel({
  rows,
  loading,
  myWallet,
}: {
  rows: FanLeaderRow[];
  loading: boolean;
  myWallet: string | null;
}) {
  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading leaderboard…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/50 p-6 text-center text-sm text-muted-foreground">
        No XP yet — vote on polls, claim drops, and check in at the stadium to climb the board.
        <div className="mt-3 flex justify-center gap-3 text-xs font-semibold">
          <Link to="/predict" className="text-accent">
            Polls →
          </Link>
          <Link to="/moments" className="text-accent">
            Drops →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-accent/20 bg-card/70">
      <div className="border-b border-border/50 px-4 py-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">XP leaderboard</p>
        <p className="text-xs text-muted-foreground">Top fans by MatchMind passport XP</p>
      </div>
      <ol className="divide-y divide-border/40">
        {rows.map((row) => {
          const mine = myWallet && row.wallet === myWallet;
          return (
            <li
              key={row.wallet}
              className={`flex items-center gap-3 px-4 py-3 ${mine ? "bg-accent/10" : ""}`}
            >
              <span
                className={`grid size-8 place-items-center rounded-full font-mono text-xs font-bold ${
                  row.rank <= 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {row.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {displayName(row.nickname, row.wallet)}
                  {mine ? <span className="ml-1.5 font-mono text-[10px] text-accent">YOU</span> : null}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Lv {row.level} · {row.momentsClaimed} drops · streak {row.streak}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="font-mono text-sm font-bold text-accent tabular-nums">
                  {row.xp.toLocaleString()} XP
                </p>
                {!mine && myWallet ? <FollowButton wallet={row.wallet} /> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function FollowButton({ wallet }: { wallet: string }) {
  const qc = useQueryClient();
  const connected = useAppStore((s) => s.wallet.connected);
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["following"],
    queryFn: () =>
      apiFetch<{ following: { wallet: string }[] }>("/api/engagement/follow", {
        method: "POST",
        body: JSON.stringify({ action: "list" }),
      }),
    enabled: connected,
  });
  const isFollowing = (data?.following ?? []).some((f) => f.wallet === wallet);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await apiFetch<{ following: boolean }>("/api/engagement/follow", {
            method: "POST",
            body: JSON.stringify({ wallet }),
          });
          toast.success(res.following ? "Following" : "Unfollowed");
          void qc.invalidateQueries({ queryKey: ["following"] });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Follow failed");
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
        isFollowing
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border text-muted-foreground"
      }`}
    >
      <UserPlus className="size-3" />
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}

function FollowingPanel({ connected }: { connected: boolean }) {
  const { data, isPending } = useQuery({
    queryKey: ["following"],
    queryFn: () =>
      apiFetch<{
        following: { wallet: string; nickname: string | null; displayName: string | null; xp: number; level: number }[];
      }>("/api/engagement/follow", {
        method: "POST",
        body: JSON.stringify({ action: "list" }),
      }),
    enabled: connected,
  });

  if (!connected) return null;

  return (
    <section className="rounded-2xl border border-primary/25 bg-card/70 p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        Following
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Predictors you track on the terrace</p>
      {isPending ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      ) : (data?.following.length ?? 0) === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Follow someone on the XP board above.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data!.following.map((f) => (
            <li
              key={f.wallet}
              className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {f.displayName?.trim() || f.nickname || `${f.wallet.slice(0, 4)}…${f.wallet.slice(-4)}`}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Lv {f.level} · {f.xp.toLocaleString()} XP
                </p>
              </div>
              <FollowButton wallet={f.wallet} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PulsePanel({
  pulse,
  crowd,
  loading,
}: {
  pulse: {
    id: string;
    kind: "vote" | "moment" | "stadium" | "chat";
    title: string;
    body: string;
    createdAt: string;
  }[];
  crowd?: { checkedIn: number; recent: { wallet: string; nickname: string | null; verifiedAt: string }[] };
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading fan pulse…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-accent/20 bg-card/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Stadium crew</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {crowd?.checkedIn ?? 0} fans verified check-in for this match
            </p>
          </div>
          <Link
            to="/stadium"
            className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            <MapPin className="size-3.5" /> Check in
          </Link>
        </div>
        {(crowd?.recent.length ?? 0) > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {crowd!.recent.map((f) => (
              <li
                key={`${f.wallet}-${f.verifiedAt}`}
                className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
              >
                {displayName(f.nickname, f.wallet)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-accent/20 bg-card/70">
        <div className="border-b border-border/50 px-4 py-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Fan pulse</p>
          <p className="text-xs text-muted-foreground">Votes, drops, check-ins, and chat</p>
        </div>
        {pulse.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Community activity will show here as fans vote and claim.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {pulse.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <time className="shrink-0 font-mono text-[9px] text-muted-foreground">{relTime(item.createdAt)}</time>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function displayName(nickname: string | null, wallet: string): string {
  if (nickname?.trim()) return nickname.trim();
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "now";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
