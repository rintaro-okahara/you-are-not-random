import { describe, expect, it } from "vitest";
import { isProbabilityVector } from "../domain/probability";
import { historyFromHands, makeRound } from "../test/testHelpers";
import { EXPERTS, getExpertById } from "./experts";

describe("expert registry", () => {
  it("contains 24 uniquely identified, UI-ready experts", () => {
    expect(EXPERTS).toHaveLength(24);
    expect(new Set(EXPERTS.map((expert) => expert.id)).size).toBe(24);
    for (const expert of EXPERTS) {
      expect(expert.name.length).toBeGreaterThan(0);
      expect(expert.shortDescription.length).toBeGreaterThan(0);
      expect(expert.suspicionText.length).toBeGreaterThan(0);
    }
  });

  it("returns a valid distribution from every expert with no history", () => {
    for (const expert of EXPERTS) {
      expect(isProbabilityVector(expert.predictHuman([]))).toBe(true);
    }
  });

  it("Repeat Last softly predicts the last human hand", () => {
    const result = getExpertById("repeat-last").predictHuman(
      historyFromHands("paper", "scissors"),
    );
    expect(result).toEqual([0.1, 0.1, 0.8]);
  });

  it("Period 3 predicts the hand from three rounds ago", () => {
    const result = getExpertById("period-3").predictHuman(
      historyFromHands("rock", "paper", "scissors"),
    );
    expect(result).toEqual([0.8, 0.1, 0.1]);
  });

  it("First-Order Markov uses Laplace-smoothed context frequency", () => {
    const result = getExpertById("markov-1").predictHuman(
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
    expect(result[0]).toBeCloseTo(1 / 6);
    expect(result[1]).toBeCloseTo(3 / 6);
    expect(result[2]).toBeCloseTo(2 / 6);
  });

  it("Third-Order Markov backs off when its exact context is unseen", () => {
    const history = historyFromHands(
      "rock",
      "paper",
      "rock",
      "scissors",
      "rock",
      "paper",
      "rock",
    );
    expect(getExpertById("markov-3").predictHuman(history)).toEqual(
      getExpertById("markov-1").predictHuman(history),
    );
  });

  it("Win-Stay reacts only after a human win", () => {
    const prior = makeRound("paper", {
      aiHand: "rock",
      actualReward: -1,
    });
    expect(getExpertById("human-win-stay").predictHuman([prior])).toEqual([
      0.1, 0.8, 0.1,
    ]);
  });

  it("Lose-Shift experts use both cycle directions after a human loss", () => {
    const prior = makeRound("rock", {
      aiHand: "paper",
      actualReward: 1,
    });
    expect(
      getExpertById("human-lose-shift-forward").predictHuman([prior]),
    ).toEqual([0.1, 0.8, 0.1]);
    expect(
      getExpertById("human-lose-shift-backward").predictHuman([prior]),
    ).toEqual([0.1, 0.1, 0.8]);
  });

  it("does not mutate or append to supplied completed history", () => {
    const history = [...historyFromHands("rock", "paper")];
    const snapshot = structuredClone(history);
    for (const expert of EXPERTS) {
      expert.predictHuman(history);
    }
    expect(history).toEqual(snapshot);
  });
});
