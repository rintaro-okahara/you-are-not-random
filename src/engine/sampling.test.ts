import { describe, expect, it } from "vitest";
import { sampleHand, secureRandom } from "./sampling";

describe("sampling", () => {
  it.each([
    [0, "rock"],
    [0.199999, "rock"],
    [0.2, "paper"],
    [0.499999, "paper"],
    [0.5, "scissors"],
    [0.999999, "scissors"],
  ] as const)("maps random value %f into the expected hand", (value, expected) => {
    expect(sampleHand([0.2, 0.3, 0.5], () => value)).toBe(expected);
  });

  it("returns crypto-backed values in the unit interval", () => {
    for (let sample = 0; sample < 100; sample += 1) {
      const value = secureRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
