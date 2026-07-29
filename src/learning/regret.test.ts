import { describe, expect, it } from "vitest";
import { makeRound } from "../test/testHelpers";
import { calculateRegret } from "./regret";

describe("empirical best-fixed-expert regret", () => {
  it("matches a hand-calculated two-round example", () => {
    const rounds = [
      makeRound("rock", {
        id: "one",
        expertWeightsBefore: [0.5, 0.5],
        expertRewards: [1, 0],
      }),
      makeRound("paper", {
        id: "two",
        expertWeightsBefore: [0.5, 0.5],
        expertRewards: [-1, 1],
      }),
    ];

    expect(calculateRegret(rounds)).toEqual({
      learningRounds: 2,
      bestExpertIndex: 1,
      expertCumulativeRewards: [0, 1],
      bestExpertReward: 1,
      algorithmExpectedReward: 0.5,
      empiricalRegret: 0.5,
      perRoundRegret: 0.25,
    });
  });

  it("can be negative and does not clamp to zero", () => {
    const rounds = [
      makeRound("rock", {
        expertWeightsBefore: [1.5, -0.5],
        expertRewards: [1, 0],
      }),
    ];
    expect(calculateRegret(rounds).empiricalRegret).toBe(-0.5);
  });

  it("ignores rounds played while learning is disabled", () => {
    const result = calculateRegret([
      makeRound("rock", {
        learningEnabled: false,
        expertWeightsBefore: [0.5, 0.5],
        expertRewards: [1, -1],
      }),
    ]);
    expect(result.learningRounds).toBe(0);
    expect(result.perRoundRegret).toBe(0);
  });
});
