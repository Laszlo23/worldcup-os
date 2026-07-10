"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Brain } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/trader/AppShell";
import { GlassCard } from "@/components/trader/GlassCard";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Why did the AI choose Brazil?",
  "Show me today's strongest signals",
  "Which matches have unusual market movement?",
  "Explain the latest prediction",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { reply } = await api.chat(text);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Unable to reach AI analyst. Ensure the engine is running." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple" />
        <h1 className="text-xl font-bold">AI Sports Analyst</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground hover:border-gold/30 hover:text-foreground">
            {s}
          </button>
        ))}
      </div>

      <div className="mb-4 min-h-[40vh] space-y-3">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <GlassCard className={`max-w-[85%] p-3 text-sm ${m.role === "user" ? "bg-gold/10" : ""}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </GlassCard>
          </motion.div>
        ))}
        {loading && <p className="text-sm text-muted-foreground animate-pulse">Analyzing TxLINE data...</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about signals, matches, odds..."
          className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-gold/50"
        />
        <Button type="submit" size="icon" disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </AppShell>
  );
}
