import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, Megaphone, MessageSquareHeart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/matchmind/AppShell";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";
import { queryKeys } from "@/lib/queries/hooks";

export const Route = createFileRoute("/wishes")({
  component: WishesScreen,
});

type WishKind = "feature" | "feedback" | "shoutout";

type FanWish = {
  id: string;
  kind: WishKind;
  body: string;
  cheers: number;
  createdAt: string;
  cheeredByMe: boolean;
  author: { wallet: string; nickname: string | null; displayName: string | null };
};

const KIND_META: Record<WishKind, { label: string; hint: string; icon: typeof Sparkles }> = {
  feature: { label: "Feature wish", hint: "What should we build next?", icon: Sparkles },
  feedback: { label: "Feedback", hint: "Tell us what works (or doesn't)", icon: MessageSquareHeart },
  shoutout: { label: "Shoutout", hint: "Celebrate a fan, player, or play", icon: Megaphone },
};

function WishesScreen() {
  const wallet = useAppStore((s) => s.wallet);
  const [kind, setKind] = useState<WishKind | "all">("all");
  const [draftKind, setDraftKind] = useState<WishKind>("feature");
  const [body, setBody] = useState("");
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: [...queryKeys.wishes, kind],
    queryFn: async () => {
      const qs = kind === "all" ? "" : `?kind=${kind}`;
      return apiFetch<{ wishes: FanWish[] }>(`/api/engagement/wishes${qs}`);
    },
    refetchInterval: 12_000,
  });

  const post = useMutation({
    mutationFn: () =>
      apiFetch<{ wish: FanWish }>("/api/engagement/wishes", {
        method: "POST",
        body: JSON.stringify({ kind: draftKind, body }),
      }),
    onSuccess: () => {
      setBody("");
      toast.success("Posted to the terrace");
      void qc.invalidateQueries({ queryKey: queryKeys.wishes });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Post failed");
    },
  });

  const cheer = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ cheers: number }>(`/api/engagement/wishes/${id}/cheer`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.wishes }),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Cheer failed");
    },
  });

  const wishes = data?.wishes ?? [];

  return (
    <AppShell title="Fan Wishes" subtitle="Features · feedback · shoutouts">
      <section className="px-4 pt-4">
        <div className="rounded-3xl border border-accent/30 bg-accent/8 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Terrace board</p>
          <h2 className="mt-1 font-display text-xl font-bold italic tracking-tight">Wish it into the product</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask for features, drop feedback, or shout out a play. Cheers surface the loudest ideas.
          </p>
        </div>
      </section>

      <section className="mt-4 px-4">
        {!wallet.connected ? (
          <div className="rounded-2xl border border-border bg-card/60 p-4 text-center">
            <p className="text-sm text-muted-foreground">Connect to post a wish</p>
            <div className="mt-3 flex justify-center">
              <ConnectWalletButton size="default" />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card/80 p-4">
            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-background/50 p-1">
              {(Object.keys(KIND_META) as WishKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDraftKind(k)}
                  className={`rounded-xl px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-wider ${
                    draftKind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {KIND_META[k].label.split(" ")[0]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{KIND_META[draftKind].hint}</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="Type your wish…"
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background/70 px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
            />
            <Button
              className="mt-2 w-full"
              disabled={post.isPending || body.trim().length < 3}
              onClick={() => post.mutate()}
            >
              {post.isPending ? <Loader2 className="size-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        )}
      </section>

      <section className="mt-5 px-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["all", "feature", "feedback", "shoutout"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                kind === k
                  ? "border-primary/45 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading wishes…</p>
        ) : wishes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No wishes yet — be first.</p>
        ) : (
          <ul className="space-y-2.5 pb-4">
            {wishes.map((w) => {
              const Meta = KIND_META[w.kind];
              const Icon = Meta.icon;
              const name =
                w.author.displayName?.trim() ||
                w.author.nickname ||
                `${w.author.wallet.slice(0, 4)}…${w.author.wallet.slice(-4)}`;
              return (
                <li key={w.id} className="rounded-2xl border border-border bg-card/70 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent">
                        <Icon className="size-3" />
                        {Meta.label}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-snug">{w.body}</p>
                      <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{name}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!wallet.connected || cheer.isPending}
                      onClick={() => cheer.mutate(w.id)}
                      className={`inline-flex shrink-0 flex-col items-center rounded-xl border px-2.5 py-1.5 ${
                        w.cheeredByMe
                          ? "border-live/40 bg-live/15 text-live"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <Heart className={`size-3.5 ${w.cheeredByMe ? "fill-current" : ""}`} />
                      <span className="mt-0.5 font-mono text-[10px] font-bold tabular-nums">{w.cheers}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
