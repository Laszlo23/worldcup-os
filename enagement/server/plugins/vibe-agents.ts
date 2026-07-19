import { definePlugin } from "nitro";

/**
 * Keep terrace vibe agents chatting + voting even when worldcup-worker
 * is on a different host. Interval is intentionally slower than the worker.
 */
export default definePlugin(() => {
  if (process.env.VIBE_AGENTS_ENABLED === "0") return;
  if (process.env.NODE_ENV === "test") return;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { runVibeAgentsTick } = await import("@shared/server/services/vibe-agents");
      const result = await runVibeAgentsTick();
      if (result.chats || result.votes) {
        console.info(
          `[vibe-agents] chats=${result.chats} votes=${result.votes}` +
            (result.errors.length ? ` errors=${result.errors.length}` : ""),
        );
      }
    } catch (err) {
      console.error("[vibe-agents]", err instanceof Error ? err.message : err);
    } finally {
      running = false;
    }
  };

  // First tick after boot, then every ~50s
  const boot = setTimeout(() => void tick(), 12_000);
  const interval = setInterval(() => void tick(), 50_000);

  if (typeof boot.unref === "function") boot.unref();
  if (typeof interval.unref === "function") interval.unref();
});
