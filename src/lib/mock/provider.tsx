/**
 * Mock TxLINE provider.
 *
 * TODO: TxLINE integration points
 * - SSE feed:         GET  /txline/stream/matches            (Server-Sent Events)
 * - Validation:       POST /txline/validate/{matchId}        (returns merkle proof + signature)
 * - Solana escrow:    Anchor program `worldcup_os` w/ instructions:
 *                       - place_prediction(market, outcome, amount)
 *                       - settle_market(market, proof_hash, merkle_root, signature)  (CPI to TxLINE validator)
 *                       - claim(prediction)
 *
 * Replace the setInterval simulators below with an EventSource
 * subscription to the TxLINE SSE endpoints. The reducer functions
 * (goal, oddsTick, settle) stay identical because payloads already
 * match the TxLINE normalized JSON schema in ./types.ts
 */
import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "../store";

export function MockLiveProvider() {
  const updateMatch = useAppStore((s) => s.updateMatch);
  const matches = useAppStore((s) => s.matches);

  useEffect(() => {
    // minute ticker
    const tick = setInterval(() => {
      const state = useAppStore.getState();
      for (const m of state.matches) {
        if (m.status === "live" && m.minute < 90) {
          updateMatch(m.id, { minute: m.minute + 1 });
        }
      }
    }, 15_000);

    // odds shimmer
    const odds = setInterval(() => {
      const state = useAppStore.getState();
      for (const m of state.matches) {
        if (m.status !== "live") continue;
        const jitter = () => (Math.random() - 0.5) * 0.08;
        const newOdds = {
          home: Math.max(1.1, +(m.odds.home + jitter()).toFixed(2)),
          draw: Math.max(1.1, +(m.odds.draw + jitter()).toFixed(2)),
          away: Math.max(1.1, +(m.odds.away + jitter()).toFixed(2)),
          updatedAt: Date.now(),
        };
        updateMatch(m.id, {
          odds: newOdds,
          oddsHistory: [...m.oddsHistory.slice(-29), { t: Date.now(), ...newOdds }],
        });
      }
    }, 5_000);

    // random goals
    const goals = setInterval(() => {
      const state = useAppStore.getState();
      const live = state.matches.filter((m) => m.status === "live");
      if (!live.length) return;
      if (Math.random() > 0.35) return;
      const m = live[Math.floor(Math.random() * live.length)];
      const homeGoal = Math.random() > 0.5;
      const team = homeGoal ? m.home : m.away;
      const scorer = ["L. Messi", "K. Mbappé", "Vinicius Jr.", "J. Bellingham", "P. Foden"][Math.floor(Math.random() * 5)];
      updateMatch(m.id, {
        scoreHome: homeGoal ? m.scoreHome + 1 : m.scoreHome,
        scoreAway: homeGoal ? m.scoreAway : m.scoreAway + 1,
        events: [
          { id: "ev" + Date.now(), minute: m.minute, type: "goal", teamId: team.id, player: scorer },
          ...m.events,
        ],
      });
      toast.success(`⚽ GOAL — ${team.name}`, {
        description: `${scorer} · ${m.minute}' · ${m.home.code} ${homeGoal ? m.scoreHome + 1 : m.scoreHome} – ${homeGoal ? m.scoreAway : m.scoreAway + 1} ${m.away.code}`,
      });
    }, 20_000);

    return () => {
      clearInterval(tick);
      clearInterval(odds);
      clearInterval(goals);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
  void matches;
}
