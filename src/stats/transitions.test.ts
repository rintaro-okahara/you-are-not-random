import { describe, expect, it } from "vitest";
import { historyFromHands } from "../test/testHelpers";
import { calculateTransitions } from "./transitions";

describe("first-order human transition matrix", () => {
  it("starts with uniform Laplace-smoothed rows and zero samples", () => {
    const result = calculateTransitions([]);
    expect(result).toHaveLength(3);
    for (const row of result) {
      expect(row.sampleCount).toBe(0);
      expect(row.probabilities[0]).toBeCloseTo(1 / 3);
      expect(row.probabilities[1]).toBeCloseTo(1 / 3);
      expect(row.probabilities[2]).toBeCloseTo(1 / 3);
    }
  });

  it("counts transitions by previous-hand row with Laplace smoothing", () => {
    const result = calculateTransitions(
      historyFromHands("rock", "paper", "rock", "paper", "scissors"),
    );
    const rockRow = result[0];
    expect(rockRow?.fromHand).toBe("rock");
    expect(rockRow?.sampleCount).toBe(2);
    expect(rockRow?.probabilities[0]).toBeCloseTo(1 / 5);
    expect(rockRow?.probabilities[1]).toBeCloseTo(3 / 5);
    expect(rockRow?.probabilities[2]).toBeCloseTo(1 / 5);
  });
});
