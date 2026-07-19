"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/hooks";
import { showStickerEarnToast } from "@/components/matchmind/StickerEarnToast";
import { useClientMounted } from "@/hooks/use-client-mounted";

type ShareActionsProps = {
  contentType: string;
  contentId: string;
  title: string;
  url?: string;
  className?: string;
};

export function ShareActions({ contentType, contentId, title, url, className }: ShareActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const qc = useQueryClient();
  const mounted = useClientMounted();
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  async function awardShare(channel: "x" | "copy" | "native") {
    try {
      const result = await apiFetch<{
        awarded: number;
        duplicate?: boolean;
        newSticker?: { id: string; title: string; rarity: string; imageUrl: string; setCompleted?: boolean };
      }>("/api/superfan/share", {
        method: "POST",
        body: JSON.stringify({ app: "matchmind", channel, contentType, contentId, url: shareUrl }),
      });
      if (result.awarded > 0) toast.success(`+${result.awarded} Superfan Points`);
      else if (result.duplicate) toast.message("Already shared today");
      if (result.newSticker) {
        showStickerEarnToast(result.newSticker);
        void qc.invalidateQueries({ queryKey: queryKeys.stickerAlbum });
        void qc.invalidateQueries({ queryKey: queryKeys.passport });
      }
      void qc.invalidateQueries({ queryKey: ["communityTasks"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect wallet to earn points");
    }
  }

  async function shareX() {
    setLoading("x");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — MatchMind`)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener",
    );
    await awardShare("x");
    setLoading(null);
  }

  async function copyLink() {
    setLoading("copy");
    try {
      await navigator.clipboard.writeText(`${title}\n${shareUrl}`);
      toast.success("Prediction link copied");
      await awardShare("copy");
    } catch {
      toast.error("Could not copy");
    }
    setLoading(null);
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    setLoading("native");
    try {
      await navigator.share({ title: "MatchMind prediction", text: title, url: shareUrl });
      await awardShare("native");
    } catch {
      // user cancelled
    }
    setLoading(null);
  }

  const canNative = mounted && typeof navigator.share === "function";

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        disabled={loading !== null}
        onClick={() => void shareX()}
      >
        <Share2 className="h-3.5 w-3.5" /> Share on X
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        disabled={loading !== null}
        onClick={() => void copyLink()}
      >
        <Copy className="h-3.5 w-3.5" /> Copy link
      </button>
      {canNative ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
          disabled={loading !== null}
          onClick={() => void nativeShare()}
        >
          Share
        </button>
      ) : null}
    </div>
  );
}
