import { describe, expect, it } from "vitest";
import { UNIFORM_PROBABILITY } from "../domain/probability";
import { EXPERTS } from "../learning/experts";
import { DEFAULT_ALPHA, uniformWeights } from "../learning/hedge";
import { appReducer, type AppAction } from "./appReducer";
import { createInitialState } from "./initialState";

const zeroRandom = () => 0;

function reduce(action: AppAction) {
  return appReducer(createInitialState({ random: zeroRandom }), action);
}

describe("application reducer", () => {
  it("initializes a sampled private pending round", () => {
    const state = createInitialState({ random: zeroRandom });
    expect(state.pendingRound.aiHand).toBe("rock");
    expect(state.pendingRound.expertActionDistributions).toHaveLength(
      EXPERTS.length,
    );
    expect(state.recentHistory).toEqual([]);
    expect(state.celebrateVictory).toBe(false);
  });

  it("plays the pending round and prepares the next one", () => {
    const before = createInitialState({ random: zeroRandom });
    const after = appReducer(before, {
      type: "play",
      humanHand: "paper",
      random: () => 0.999,
    });
    expect(after.recentHistory).toHaveLength(1);
    expect(after.recentHistory[0]?.aiHand).toBe("rock");
    expect(after.pendingRound.aiHand).toBe("scissors");
  });

  it("resamples a uniform pending round when learning is disabled", () => {
    const state = reduce({
      type: "set-learning",
      enabled: false,
      random: () => 0.7,
    });
    expect(state.learningEnabled).toBe(false);
    expect(state.pendingRound.aiDistribution).toEqual(UNIFORM_PROBABILITY);
    expect(state.pendingRound.aiHand).toBe("scissors");
  });

  it("clamps Fixed Share alpha to the UI range", () => {
    expect(reduce({ type: "set-alpha", alpha: 9 }).alpha).toBe(0.2);
    expect(reduce({ type: "set-alpha", alpha: -1 }).alpha).toBe(0);
  });

  it("resets history, settings, weights, and pending round", () => {
    const played = appReducer(createInitialState({ random: zeroRandom }), {
      type: "play",
      humanHand: "rock",
      random: zeroRandom,
    });
    const reset = appReducer(played, {
      type: "reset",
      random: zeroRandom,
    });
    expect(reset.recentHistory).toEqual([]);
    expect(reset.alpha).toBe(DEFAULT_ALPHA);
    expect(reset.learningEnabled).toBe(true);
    expect(reset.expertWeights).toEqual(uniformWeights(EXPERTS.length));
    expect(reset.pendingRound.aiHand).toBe("rock");
  });

  it("keeps 15 display rounds while aggregates continue incrementally", () => {
    let state = createInitialState({ random: zeroRandom });
    for (let round = 0; round < 20; round += 1) {
      state = appReducer(state, {
        type: "play",
        humanHand: "rock",
        random: zeroRandom,
        createId: () => `round-${round}`,
      });
    }
    expect(state.recentHistory).toHaveLength(15);
    expect(state.recentHistory[0]?.id).toBe("round-5");
    expect(state.learningStats.totalRounds).toBe(20);
    expect(state.regretStats.learningRounds).toBe(20);
  });

  it("stops at round 50, then continues without replacing the result", () => {
    let state = createInitialState({ random: zeroRandom });
    for (let round = 0; round < 50; round += 1) {
      state = appReducer(state, {
        type: "play",
        humanHand: "paper",
        random: zeroRandom,
        now: () => round,
        createId: () => `challenge-${round}`,
      });
    }

    expect(state.challenge.status).toBe("result");
    expect(state.challenge.result).not.toBeNull();
    expect(state.celebrateVictory).toBe(true);
    const frozenResult = state.challenge.result;

    const blocked = appReducer(state, {
      type: "play",
      humanHand: "rock",
      random: zeroRandom,
    });
    expect(blocked.learningStats.totalRounds).toBe(50);

    const continued = appReducer(state, { type: "continue-challenge" });
    const reopened = appReducer(continued, { type: "show-challenge-result" });
    expect(continued.celebrateVictory).toBe(false);
    expect(reopened.celebrateVictory).toBe(false);
    expect(reopened.challenge.status).toBe("result");
    expect(reopened.challenge.result).toEqual(frozenResult);

    const round51 = appReducer(continued, {
      type: "play",
      humanHand: "rock",
      random: zeroRandom,
      createId: () => "continued-51",
    });
    expect(round51.learningStats.totalRounds).toBe(51);
    expect(round51.challenge.result).toEqual(frozenResult);
  });

  it("retries with clean learning data while preserving user settings", () => {
    let state = createInitialState({ random: zeroRandom });
    state = appReducer(state, { type: "set-alpha", alpha: 0.12 });
    state = appReducer(state, {
      type: "set-learning",
      enabled: false,
      random: zeroRandom,
    });
    state = appReducer(state, {
      type: "play",
      humanHand: "rock",
      random: zeroRandom,
    });

    const retried = appReducer(state, {
      type: "retry-challenge",
      random: zeroRandom,
    });

    expect(retried.learningStats.totalRounds).toBe(0);
    expect(retried.recentHistory).toEqual([]);
    expect(retried.challenge.result).toBeNull();
    expect(retried.alpha).toBe(0.12);
    expect(retried.learningEnabled).toBe(false);
  });
});
