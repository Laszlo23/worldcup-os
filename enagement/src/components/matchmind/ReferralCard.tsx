import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";

const REF_KEY = "matchmind-pending-ref";

export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem(REF_KEY, ref.trim().toUpperCase());
  } catch {
    /* ignore */
  }
}

export function ReferralCard() {
  const wallet = useAppStore((s) => s.wallet);
  const qc = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["referral"],
    queryFn: () =>
      apiFetch<{ code: string; invited: number; rewarded: number; shareUrl: string }>(
        "/api/engagement/referral",
      ),
    enabled: wallet.connected,
  });

  const apply = useMutation({
    mutationFn: (code: string) =>
      apiFetch("/api/engagement/referral/apply", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => {
      toast.success("Referral applied — lock a vote to unlock bonus XP");
      try {
        localStorage.removeItem(REF_KEY);
      } catch {
        /* ignore */
      }
      void qc.invalidateQueries({ queryKey: ["referral"] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed";
      if (!/already/i.test(msg)) toast.error(msg);
      try {
        localStorage.removeItem(REF_KEY);
      } catch {
        /* ignore */
      }
    },
  });

  useEffect(() => {
    if (!wallet.connected) return;
    try {
      const pending = localStorage.getItem(REF_KEY);
      if (pending) apply.mutate(pending);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once when connected
  }, [wallet.connected]);

  if (!wallet.connected) return null;

  return (
    <section className="rounded-3xl border border-accent/30 bg-accent/8 p-4">
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
        <Gift className="size-3.5" />
        Invite crew
      </p>
      <h3 className="mt-1 font-display text-lg font-bold italic tracking-tight">Referral link</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Share your code. When a friend creates a wallet and locks their first on-chain vote, you get +80 XP and
        they get +40 XP.
      </p>
      {isPending ? (
        <Loader2 className="mt-3 size-4 animate-spin text-muted-foreground" />
      ) : data ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-xl border border-border bg-background/60 px-3 py-2 font-mono text-sm font-bold">
              {data.code}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => {
                void navigator.clipboard.writeText(data.shareUrl);
                toast.success("Invite link copied");
              }}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            Invited {data.invited} · Rewarded {data.rewarded}
          </p>
        </>
      ) : null}
    </section>
  );
}
