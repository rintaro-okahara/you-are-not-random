import { describe, expect, it } from "vitest";
import {
  HANDS,
  PAYOFF_MATRIX,
  counterHand,
  cycleBackward,
  cycleForward,
  getOutcome,
  getPayoff,
  rewardVectorForHuman,
} from "./rps";
import type { Hand } from "./types";

describe("rock-paper-scissors domain", () => {
  it("uses one canonical rock, paper, scissors order", () => {
    expect(HANDS).toEqual(["rock", "paper", "scissors"]);
    expect(PAYOFF_MATRIX).toEqual([
      [0, -1, 1],
      [1, 0, -1],
      [-1, 1, 0],
    ]);
  });

  it.each([
    ["rock", "rock", 0],
    ["rock", "paper", -1],
    ["rock", "scissors", 1],
    ["paper", "rock", 1],
    ["paper", "paper", 0],
    ["paper", "scissors", -1],
    ["scissors", "rock", -1],
    ["scissors", "paper", 1],
    ["scissors", "scissors", 0],
  ] satisfies ReadonlyArray<readonly [Hand, Hand, -1 | 0 | 1]>)(
    "scores AI %s against human %s as %i",
    (aiHand, humanHand, expected) => {
      expect(getPayoff(aiHand, humanHand)).toBe(expected);
    },
  );

  it("returns the full reward vector for a revealed human hand", () => {
    expect(rewardVectorForHuman("rock")).toEqual([0, 1, -1]);
    expect(rewardVectorForHuman("paper")).toEqual([-1, 0, 1]);
    expect(rewardVectorForHuman("scissors")).toEqual([1, -1, 0]);
  });

  it("names outcomes from the human point of view", () => {
    expect(getOutcome("paper", "rock")).toBe("ai-win");
    expect(getOutcome("rock", "paper")).toBe("human-win");
    expect(getOutcome("scissors", "scissors")).toBe("draw");
  });

  it("provides the canonical counter and both cycle directions", () => {
    expect(counterHand("rock")).toBe("paper");
    expect(cycleForward("rock")).toBe("paper");
    expect(cycleForward("scissors")).toBe("rock");
    expect(cycleBackward("rock")).toBe("scissors");
    expect(cycleBackward("scissors")).toBe("paper");
  });
});
