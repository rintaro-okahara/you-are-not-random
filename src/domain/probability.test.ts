import { describe, expect, it } from "vitest";
import {
  UNIFORM_PROBABILITY,
  isProbabilityVector,
  normalizeProbability,
} from "./probability";

describe("probability helpers", () => {
  it("normalizes non-negative finite values", () => {
    expect(normalizeProbability([2, 3, 5])).toEqual([0.2, 0.3, 0.5]);
  });

  it("repairs invalid or zero-sum vectors to uniform", () => {
    expect(normalizeProbability([0, 0, 0])).toEqual(UNIFORM_PROBABILITY);
    expect(normalizeProbability([Number.NaN, 1, 1])).toEqual(
      UNIFORM_PROBABILITY,
    );
    expect(normalizeProbability([-1, 1, 1])).toEqual(UNIFORM_PROBABILITY);
  });

  it("recognizes only finite, normalized, non-negative vectors", () => {
    expect(isProbabilityVector([0.2, 0.3, 0.5])).toBe(true);
    expect(isProbabilityVector([0.2, 0.3, 0.4])).toBe(false);
    expect(isProbabilityVector([0.5, -0.1, 0.6])).toBe(false);
  });
});
