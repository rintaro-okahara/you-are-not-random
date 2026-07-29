import { describe, expect, it } from "vitest";
import { buildLearningStats, createLearningStats } from "../learning/learningStats";
import { makeRound } from "../test/testHelpers";
import { aggregateStats } from "./aggregateStats";

describe("aggregate match statistics", () => {
  it("uses zero-safe defaults before any round", () => {
    expect(aggregateStats(createLearningStats())).toEqual({
      totalRounds: 0,
      aiWins: 0,
      humanWins: 0,
      draws: 0,
      aiWinRate: 0,
      recentAiWinRate: 0,
      streakKind: "none",
      streakCount: 0,
    });
  });

  it("calculates total, recent-10 rate, and the current streak", () => {
    const history = [
      makeRound("rock", { actualReward: -1 }),
      makeRound("rock", { actualReward: 0 }),
      ...Array.from({ length: 9 }, () =>
        makeRound("rock", { actualReward: 1 }),
      ),
      makeRound("rock", { actualReward: -1 }),
      makeRound("rock", { actualReward: -1 }),
    ];
    const result = aggregateStats(buildLearningStats(history));
    expect(result.totalRounds).toBe(13);
    expect(result.aiWins).toBe(9);
    expect(result.humanWins).toBe(3);
    expect(result.draws).toBe(1);
    expect(result.aiWinRate).toBeCloseTo(9 / 13);
    expect(result.recentAiWinRate).toBeCloseTo(8 / 10);
    expect(result.streakKind).toBe("human-win");
    expect(result.streakCount).toBe(2);
  });
});
