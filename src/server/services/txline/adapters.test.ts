import { describe, it, expect } from "vitest";
import {
  mapGameStateToStatus,
  pickLatestScoreSnapshot,
  resolveMarketOutcome,
  resolveWinnerOutcome,
  scoreSnapshotToUpdate,
  teamFromParticipant,
} from "./adapters";

describe("TxLINE adapters", () => {
  it("maps soccer game phases to match status", () => {
    expect(mapGameStateToStatus(1)).toBe("scheduled");
    expect(mapGameStateToStatus(2)).toBe("live");
    expect(mapGameStateToStatus(3)).toBe("halftime");
    expect(mapGameStateToStatus(5)).toBe("finished");
    expect(mapGameStateToStatus(100)).toBe("finished");
    expect(mapGameStateToStatus(1, undefined, "game_finalised")).toBe("finished");
  });

  it("builds team from participant", () => {
    const team = teamFromParticipant({ id: 1, name: "Argentina", code: "ARG" }, "x");
    expect(team.name).toBe("Argentina");
    expect(team.code).toBe("ARG");
  });

  it("resolves over/under market", () => {
    expect(resolveMarketOutcome("over_2_5", "Over 2.5", 2, 1)).toBe(true);
    expect(resolveMarketOutcome("over_2_5", "Under 2.5", 1, 0)).toBe(true);
  });

  it("resolves BTTS market", () => {
    expect(resolveMarketOutcome("btts", "Yes", 1, 1)).toBe(true);
    expect(resolveMarketOutcome("btts", "No", 1, 0)).toBe(true);
  });

  it("resolves winner market", () => {
    expect(resolveWinnerOutcome("Argentina", "Brazil", "Argentina", 2, 1)).toBe(true);
    expect(resolveWinnerOutcome("Argentina", "Brazil", "Draw", 1, 1)).toBe(true);
  });

  it("picks latest score snapshot and maps live state", () => {
    const rows = [
      { Seq: 10, Action: "disconnected" },
      { Seq: 9, Action: "goal", StatusId: 4, FixtureId: 18209181, Clock: { Seconds: 3700 }, Score: { Participant1: { Total: { Goals: 1 } }, Participant2: { Total: { Goals: 0 } } } },
    ];
    const latest = pickLatestScoreSnapshot(rows);
    expect(latest?.Seq).toBe(9);
    const update = scoreSnapshotToUpdate(latest!);
    expect(update?.scoreHome).toBe(1);
    expect(update?.scoreAway).toBe(0);
    expect(update?.minute).toBe(61);
    expect(update?.gameState).toBe(4);
  });
});
