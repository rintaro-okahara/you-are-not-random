import { describe, expect, it } from "vitest";
import { UNIFORM_PROBABILITY, isProbabilityVector } from "../domain/probability";
import {
  BEST_RESPONSE_BETA,
  EXPLORATION_EPSILON,
  predictedHumanToAiDistribution,
  stableSoftmax,
} from "./prediction";

describe("human prediction to AI action distribution", () => {
  it("keeps a uniform human prediction uniform", () => {
    const result = predictedHumanToAiDistribution(UNIFORM_PROBABILITY);
    expect(result[0]).toBeCloseTo(1 / 3);
    expect(result[1]).toBeCloseTo(1 / 3);
    expect(result[2]).toBeCloseTo(1 / 3);
  });

  it("produces normalized non-negative action probabilities", () => {
    const result = predictedHumanToAiDistribution([0.8, 0.1, 0.1]);
    expect(isProbabilityVector(result)).toBe(true);
    expect(result.every((value) => value >= 0)).toBe(true);
    expect(result[1]).toBeGreaterThan(result[0]);
    expect(result[1]).toBeGreaterThan(result[2]);
  });

  it("uses the specified response and exploration constants", () => {
    expect(BEST_RESPONSE_BETA).toBe(5);
    expect(EXPLORATION_EPSILON).toBe(0.05);
  });

  it("stabilizes softmax for very large values", () => {
    const result = stableSoftmax([1_000_000, 999_999, -1_000_000]);
    expect(isProbabilityVector(result)).toBe(true);
    expect(result.every(Number.isFinite)).toBe(true);
    expect(result[0]).toBeGreaterThan(result[1]);
  });
});
