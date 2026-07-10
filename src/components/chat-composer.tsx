import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectWalletButton } from "@/components/connect-wallet";
import { useAppStore } from "@/lib/store";
import { usePostChatMessage } from "@/lib/queries/hooks";
import { toast } from "sonner";

const MAX_LENGTH = 500;

export function ChatComposer() {
  const wallet = useAppStore((s) => s.wallet);
  const [text, setText] = useState("");
  const postMessage = usePostChatMessage();

  const submit = async () => {
    const body = text.trim();
    if (!body || postMessage.isPending) return;

    try {
      await postMessage.mutateAsync(body);
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  if (!wallet.connected) {
    return (
      <div className="px-4 py-3 border-t border-border/40 shrink-0 bg-black/20 flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground text-center">Connect wallet to join the chat</p>
        <ConnectWalletButton size="sm" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="px-4 py-3 border-t border-border/40 shrink-0 bg-black/20">
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKeyDown}
          placeholder="Message the room…"
          className="glass text-sm min-h-[40px]"
          maxLength={MAX_LENGTH}
          disabled={postMessage.isPending}
          aria-label="Chat message"
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 bg-gradient-primary text-primary-foreground border-0 min-h-[40px] min-w-[40px]"
          disabled={!text.trim() || postMessage.isPending}
          aria-label="Send message"
        >
          {postMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground mt-1.5 text-right tabular-nums">
        {text.length}/{MAX_LENGTH}
      </p>
    </form>
  );
}
