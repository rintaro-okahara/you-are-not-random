import { describe, expect, it } from "vitest";
import { UNIFORM_PROBABILITY } from "../domain/probability";
import { EXPERTS } from "../learning/experts";
import { uniformWeights } from "../learning/hedge";
import { historyFromHands, makeRound } from "../test/testHelpers";
import {
  MAX_HISTORY,
  playPendingRound,
  preparePendingRound,
} from "./gameEngine";

describe("private pending round engine", () => {
  const initialWeights = uniformWeights(EXPERTS.length);

  it("prepares and samples the AI before the human move", () => {
    const history = historyFromHands("rock", "rock");
    const pending = preparePendingRound(history, initialWeights, true, () => 0);
    expect(pending.aiHand).toBe("rock");
    expect(pending.expertActionDistributions).toHaveLength(EXPERTS.length);
    expect(pending.expertWeightsBefore).toEqual(initialWeights);
    expect(history).toHaveLength(2);
  });

  it("reveals exactly the distribution consumed by the played round", () => {
    const pending = preparePendingRound([], initialWeights, true, () => 0.7);
    const result = playPendingRound({
      pending,
      humanHand: "rock",
      history: [],
      alpha: 0.03,
      now: () => 123,
      createId: () => "round-id",
    });
    expect(result.record.id).toBe("round-id");
    expect(result.record.timestamp).toBe(123);
    expect(result.record.aiDistribution).toEqual(pending.aiDistribution);
    expect(result.record.aiHand).toBe(pending.aiHand);
    expect(result.history).toEqual([result.record]);
  });

  it("uses uniform random play and frozen weights while learning is off", () => {
    const pending = preparePendingRound(
      historyFromHands("rock", "rock", "rock"),
      initialWeights,
      false,
      () => 0.9,
    );
    expect(pending.aiDistribution).toEqual(UNIFORM_PROBABILITY);
    expect(pending.aiHand).toBe("scissors");

    const result = playPendingRound({
      pending,
      humanHand: "rock",
      history: [],
      alpha: 0.2,
    });
    expect(result.nextWeights).toEqual(initialWeights);
    expect(result.record.learningEnabled).toBe(false);
  });

  it("scores every expert and updates weights when learning is on", () => {
    const pending = preparePendingRound(
      historyFromHands("rock", "rock", "rock"),
      initialWeights,
      true,
      () => 0.5,
    );
    const result = playPendingRound({
      pending,
      humanHand: "rock",
      history: [],
      alpha: 0.03,
    });
    expect(result.record.expertRewards).toHaveLength(EXPERTS.length);
    expect(result.nextWeights).toHaveLength(EXPERTS.length);
    expect(result.nextWeights).not.toEqual(initialWeights);
    expect(result.nextWeights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
    );
  });

  it("keeps only the most recent 2,000 completed rounds", () => {
    const history = Array.from({ length: MAX_HISTORY }, (_, index) =>
      makeRound("rock", { id: `old-${index}` }),
    );
    const pending = preparePendingRound(history, initialWeights, false, () => 0);
    const result = playPendingRound({
      pending,
      humanHand: "paper",
      history,
      alpha: 0.03,
      createId: () => "newest",
    });
    expect(result.history).toHaveLength(MAX_HISTORY);
    expect(result.history[0]?.id).toBe("old-1");
    expect(result.history.at(-1)?.id).toBe("newest");
  });
});
