import { describe, expect, it } from "vitest";
import { historyFromHands, makeRound } from "../test/testHelpers";
import {
  buildLearningStats,
  createLearningStats,
  getMarkovCounts,
  updateLearningStats,
} from "./learningStats";

describe("incremental learning statistics", () => {
  it("starts with bounded empty aggregates", () => {
    expect(createLearningStats()).toMatchObject({
      totalRounds: 0,
      globalCounts: [0, 0, 0],
      recent5Counts: [0, 0, 0],
      recent10Counts: [0, 0, 0],
      recent20Counts: [0, 0, 0],
      decayedCounts: [0, 0, 0],
      recentHands: [],
      recentRewards: [],
      handStreakLength: 0,
      resultStreakCount: 0,
      aiWins: 0,
      humanWins: 0,
      draws: 0,
    });
  });

  it("matches a one-pass history build after repeated incremental updates", () => {
    const history = [
      makeRound("rock", { actualReward: 1, id: "one" }),
      makeRound("paper", { actualReward: 0, id: "two" }),
      makeRound("rock", { actualReward: -1, id: "three" }),
      makeRound("paper", { actualReward: 1, id: "four" }),
      makeRound("rock", { actualReward: 1, id: "five" }),
      makeRound("scissors", { actualReward: -1, id: "six" }),
      makeRound("rock", { actualReward: -1, id: "seven" }),
    ];
    const incremental = history.reduce(
      (stats, round) => updateLearningStats(stats, round),
      createLearningStats(),
    );
    expect(incremental).toEqual(buildLearningStats(history));
    expect(incremental.globalCounts).toEqual([4, 2, 1]);
    expect(incremental.recent5Counts).toEqual([3, 1, 1]);
    expect(incremental.aiWins).toBe(3);
    expect(incremental.humanWins).toBe(3);
    expect(incremental.draws).toBe(1);
    expect(incremental.resultStreakReward).toBe(-1);
    expect(incremental.resultStreakCount).toBe(2);
  });

  it("updates decay and Markov counts without rescanning earlier rounds", () => {
    const stats = buildLearningStats(
      historyFromHands(
        "rock",
        "paper",
        "rock",
        "paper",
        "rock",
        "scissors",
        "rock",
      ),
    );
    expect(getMarkovCounts(stats, ["rock"])).toEqual([0, 2, 1]);
    expect(getMarkovCounts(stats, ["paper", "rock"])).toEqual([0, 1, 1]);

    const expectedDecay = [0, 0, 0];
    for (const round of historyFromHands(
      "rock",
      "paper",
      "rock",
      "paper",
      "rock",
      "scissors",
      "rock",
    )) {
      expectedDecay[0] = (expectedDecay[0] ?? 0) * 0.85;
      expectedDecay[1] = (expectedDecay[1] ?? 0) * 0.85;
      expectedDecay[2] = (expectedDecay[2] ?? 0) * 0.85;
      const index =
        round.humanHand === "rock" ? 0 : round.humanHand === "paper" ? 1 : 2;
      expectedDecay[index] = (expectedDecay[index] ?? 0) + 1;
    }
    expect(stats.decayedCounts[0]).toBeCloseTo(expectedDecay[0] ?? 0);
    expect(stats.decayedCounts[1]).toBeCloseTo(expectedDecay[1] ?? 0);
    expect(stats.decayedCounts[2]).toBeCloseTo(expectedDecay[2] ?? 0);
  });

  it("keeps only the bounded windows needed by experts and the dashboard", () => {
    const history = Array.from({ length: 30 }, (_, index) =>
      makeRound(index % 2 === 0 ? "rock" : "paper", {
        actualReward: index < 20 ? 1 : -1,
        id: `round-${index}`,
      }),
    );
    const stats = buildLearningStats(history);
    expect(stats.totalRounds).toBe(30);
    expect(stats.recentHands).toHaveLength(20);
    expect(stats.recentRewards).toHaveLength(10);
    expect(stats.recent20Counts).toEqual([10, 10, 0]);
    expect(stats.recentRewards.every((reward) => reward === -1)).toBe(true);
  });
});
