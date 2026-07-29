import { describe, expect, it } from "vitest";
import { UNIFORM_PROBABILITY } from "../domain/probability";
import { EXPERTS } from "../learning/experts";
import { uniformWeights } from "../learning/hedge";
import {
  buildLearningStats,
  createLearningStats,
} from "../learning/learningStats";
import { createRegretStats } from "../learning/regret";
import { historyFromHands, makeRound } from "../test/testHelpers";
import {
  playPendingRound,
  preparePendingRound,
} from "./gameEngine";

describe("private pending round engine", () => {
  const initialWeights = uniformWeights(EXPERTS.length);

  it("prepares and samples the AI before the human move", () => {
    const history = historyFromHands("rock", "rock");
    const pending = preparePendingRound(
      buildLearningStats(history),
      initialWeights,
      true,
      () => 0,
    );
    expect(pending.aiHand).toBe("rock");
    expect(pending.expertActionDistributions).toHaveLength(EXPERTS.length);
    expect(pending.expertWeightsBefore).toEqual(initialWeights);
    expect(history).toHaveLength(2);
  });

  it("reveals exactly the distribution consumed by the played round", () => {
    const pending = preparePendingRound(
      createLearningStats(),
      initialWeights,
      true,
      () => 0.7,
    );
    const result = playPendingRound({
      pending,
      humanHand: "rock",
      learningStats: createLearningStats(),
      regretStats: createRegretStats(EXPERTS.length),
      alpha: 0.03,
      now: () => 123,
      createId: () => "round-id",
    });
    expect(result.record.id).toBe("round-id");
    expect(result.record.timestamp).toBe(123);
    expect(result.record.aiDistribution).toEqual(pending.aiDistribution);
    expect(result.record.aiHand).toBe(pending.aiHand);
  });

  it("uses uniform random play and frozen weights while learning is off", () => {
    const pending = preparePendingRound(
      buildLearningStats(historyFromHands("rock", "rock", "rock")),
      initialWeights,
      false,
      () => 0.9,
    );
    expect(pending.aiDistribution).toEqual(UNIFORM_PROBABILITY);
    expect(pending.aiHand).toBe("scissors");

    const result = playPendingRound({
      pending,
      humanHand: "rock",
      learningStats: buildLearningStats(
        historyFromHands("rock", "rock", "rock"),
      ),
      regretStats: createRegretStats(EXPERTS.length),
      alpha: 0.2,
    });
    expect(result.nextWeights).toEqual(initialWeights);
    expect(result.record.learningEnabled).toBe(false);
  });

  it("scores every expert and updates weights when learning is on", () => {
    const pending = preparePendingRound(
      buildLearningStats(historyFromHands("rock", "rock", "rock")),
      initialWeights,
      true,
      () => 0.5,
    );
    const result = playPendingRound({
      pending,
      humanHand: "rock",
      learningStats: buildLearningStats(
        historyFromHands("rock", "rock", "rock"),
      ),
      regretStats: createRegretStats(EXPERTS.length),
      alpha: 0.03,
    });
    expect(result.record.expertRewards).toHaveLength(EXPERTS.length);
    expect(result.nextWeights).toHaveLength(EXPERTS.length);
    expect(result.nextWeights).not.toEqual(initialWeights);
    expect(result.nextWeights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
    );
  });

  it("updates learning and regret aggregates exactly once", () => {
    const learningStats = buildLearningStats([
      makeRound("rock", { id: "old" }),
    ]);
    const pending = preparePendingRound(
      learningStats,
      initialWeights,
      true,
      () => 0,
    );
    const result = playPendingRound({
      pending,
      humanHand: "paper",
      learningStats,
      regretStats: createRegretStats(EXPERTS.length),
      alpha: 0.03,
      createId: () => "newest",
    });
    expect(result.nextLearningStats.totalRounds).toBe(2);
    expect(result.nextLearningStats.lastRound?.humanHand).toBe("paper");
    expect(result.nextRegretStats.learningRounds).toBe(1);
    expect(result.nextRegretStats.expertCumulativeRewards).toEqual(
      result.record.expertRewards,
    );
  });
});
