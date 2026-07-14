"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type ShareActionsProps = {
  contentType: string;
  contentId: string;
  title: string;
  url?: string;
  className?: string;
};

export function ShareActions({ contentType, contentId, title, url, className }: ShareActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  async function awardShare(channel: "x" | "copy" | "native") {
    try {
      const result = await apiFetch<{ awarded: number; duplicate?: boolean }>("/api/superfan/share", {
        method: "POST",
        body: JSON.stringify({ app: "agentx", channel, contentType, contentId, url: shareUrl }),
      });
      if (result.awarded > 0) toast.success(`+${result.awarded} Superfan Points`);
      else if (result.duplicate) toast.message("Already shared today");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect wallet to earn points");
    }
  }

  async function shareX() {
    setLoading("x");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — TxLINE AI Trader`)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener",
    );
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
      toast.error("Could not copy");
    }
    setLoading(null);
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={loading !== null} onClick={() => void shareX()}>
        <Share2 className="h-3.5 w-3.5" /> Share on X
      </Button>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={loading !== null} onClick={() => void copyLink()}>
        <Copy className="h-3.5 w-3.5" /> Copy link
      </Button>
    </div>
  );
}
