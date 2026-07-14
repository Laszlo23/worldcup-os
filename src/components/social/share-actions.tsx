"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type SuperfanApp = "wmos" | "agentx" | "matchmind";

type ShareActionsProps = {
  app: SuperfanApp;
  contentType: string;
  contentId: string;
  title: string;
  url?: string;
  className?: string;
  onShareComplete?: (points: number) => void;
  apiFetch?: <T>(path: string, init?: RequestInit) => Promise<T>;
};

function defaultApiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
    return data as T;
  });
}

export function ShareActions({
  app,
  contentType,
  contentId,
  title,
  url,
  className,
  onShareComplete,
  apiFetch = defaultApiFetch,
}: ShareActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  async function awardShare(channel: "x" | "copy" | "native") {
    try {
      const result = await apiFetch<{ awarded: number; total: number; duplicate?: boolean }>("/api/superfan/share", {
        method: "POST",
        body: JSON.stringify({ app, channel, contentType, contentId, url: shareUrl }),
      });
      if (result.awarded > 0) {
        toast.success(`+${result.awarded} Superfan Points`);
        onShareComplete?.(result.awarded);
      } else if (result.duplicate) {
        toast.message("Already shared today — points counted");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect wallet to earn share points");
    }
  }

  async function shareX() {
    setLoading("x");
    const text = encodeURIComponent(`${title} — Superteam World Cup`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener");
    await awardShare("x");
    setLoading(null);
  }

  async function copyLink() {
    setLoading("copy");
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
      await awardShare("copy");
    } catch {
      toast.error("Could not copy link");
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
      await navigator.share({ title, text: title, url: shareUrl });
      await awardShare("native");
    } catch {
      // user cancelled
    }
    setLoading(null);
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={loading !== null} onClick={() => void shareX()}>
        <Share2 className="h-3.5 w-3.5" />
        Share on X
      </Button>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={loading !== null} onClick={() => void copyLink()}>
        <Copy className="h-3.5 w-3.5" />
        Copy link
      </Button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={loading !== null} onClick={() => void nativeShare()}>
          Share
        </Button>
      )}
    </div>
  );
}
