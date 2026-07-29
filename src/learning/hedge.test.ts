import { describe, expect, it } from "vitest";
import { isProbabilityVector } from "../domain/probability";
import {
  DEFAULT_ALPHA,
  DEFAULT_ETA,
  mixDistributions,
  scoreExperts,
  uniformWeights,
  updateFixedShare,
} from "./hedge";

describe("Hedge and Fixed Share", () => {
  it("creates uniform initial expert weights", () => {
    expect(uniformWeights(4)).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it("mixes expert distributions by normalized weight", () => {
    const result = mixDistributions(
      [0.75, 0.25],
      [
        [0.8, 0.1, 0.1],
        [0.1, 0.8, 0.1],
      ],
    );
    expect(result[0]).toBeCloseTo(0.625);
    expect(result[1]).toBeCloseTo(0.275);
    expect(result[2]).toBeCloseTo(0.1);
    expect(isProbabilityVector(result)).toBe(true);
  });

  it("scores every expert against the full reward vector", () => {
    expect(
      scoreExperts(
        [
          [1, 0, 0],
          [0, 0.5, 0.5],
        ],
        [0, 1, -1],
      ),
    ).toEqual([0, 0]);
  });

  it("uses the requested default parameters", () => {
    expect(DEFAULT_ETA).toBe(0.25);
    expect(DEFAULT_ALPHA).toBe(0.03);
  });

  it("increases the weight of a better expert", () => {
    const result = updateFixedShare([0.5, 0.5], [1, -1], 0.25, 0.03);
    expect(result[0]).toBeGreaterThan(0.5);
    expect(result[1]).toBeLessThan(0.5);
  });

  it("matches ordinary normalized Hedge when alpha is zero", () => {
    const result = updateFixedShare([0.5, 0.5], [1, 0], 0.25, 0);
    const expectedFirst = Math.exp(0.25) / (Math.exp(0.25) + 1);
    expect(result[0]).toBeCloseTo(expectedFirst);
    expect(result[1]).toBeCloseTo(1 - expectedFirst);
  });

  it("becomes uniform when alpha is one", () => {
    expect(updateFixedShare([0.9, 0.1], [100, -100], 0.25, 1)).toEqual([
      0.5, 0.5,
    ]);
  });

  it("stays finite and normalized through repeated extreme updates", () => {
    let weights: readonly number[] = uniformWeights(24);
    for (let iteration = 0; iteration < 5_000; iteration += 1) {
      const rewards = weights.map((_, index) =>
        index === 0 ? 1_000_000 : -1_000_000,
      );
      weights = updateFixedShare(weights, rewards, 0.25, 0.03);
    }
    expect(weights.every((value) => Number.isFinite(value) && value >= 0)).toBe(
      true,
    );
    expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(weights.slice(1).every((value) => value > 0)).toBe(true);
  });
});
