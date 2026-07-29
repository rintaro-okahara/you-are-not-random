import { describe, expect, it } from "vitest";
import {
  advanceChallenge,
  createChallengeState,
} from "../challenge/challenge";
import { EXPERTS } from "../learning/experts";
import { uniformWeights } from "../learning/hedge";
import {
  buildLearningStats,
  createLearningStats,
} from "../learning/learningStats";
import {
  createRegretStats,
  updateRegretStats,
} from "../learning/regret";
import type { RoundRecord } from "../domain/types";
import { makeRound } from "../test/testHelpers";
import {
  MAX_STORED_ROUNDS,
  SCHEMA_VERSION,
  STORAGE_KEY,
  clearSavedState,
  loadState,
  roundStorageKey,
  saveState,
  type PersistedAppState,
} from "./localStorage";

const weights = uniformWeights(EXPERTS.length);

const defaults: PersistedAppState = {
  recentHistory: [],
  learningStats: createLearningStats(),
  regretStats: createRegretStats(EXPERTS.length),
  expertWeights: weights,
  alpha: 0.03,
  learningEnabled: true,
  challenge: createChallengeState(createLearningStats()),
  activeView: "play",
};

function validRound(id: string, humanHand: "rock" | "paper" = "paper") {
  return makeRound(humanHand, {
    id,
    expertWeightsBefore: weights,
    expertRewards: weights.map(() => 0),
  });
}

function stateWithRounds(
  rounds: readonly RoundRecord[],
  overrides: Partial<PersistedAppState> = {},
): PersistedAppState {
  return {
    ...defaults,
    recentHistory: rounds.slice(-15),
    learningStats: buildLearningStats(rounds),
    regretStats: rounds.reduce(
      updateRegretStats,
      createRegretStats(EXPERTS.length),
    ),
    ...overrides,
  };
}

describe("versioned localStorage", () => {
  it("saves and restores valid state", () => {
    const state = stateWithRounds([validRound("round-one")], {
      alpha: 0.12,
      learningEnabled: false,
    });
    saveState(state);
    expect(loadState(defaults)).toEqual(state);
    expect(SCHEMA_VERSION).toBe(3);
    expect(localStorage.getItem(roundStorageKey(0))).not.toBeNull();
  });

  it("persists the active view", () => {
    saveState({ ...defaults, activeView: "lab" });
    expect(loadState(defaults).activeView).toBe("lab");
  });

  it("migrates cumulative schema v2 state into a fresh challenge", () => {
    const rounds = [
      validRound("legacy-one"),
      validRound("legacy-two"),
      validRound("legacy-three"),
    ];
    const legacy = stateWithRounds(rounds);
    const legacyState = {
      learningStats: legacy.learningStats,
      regretStats: legacy.regretStats,
      expertWeights: legacy.expertWeights,
      alpha: legacy.alpha,
      learningEnabled: legacy.learningEnabled,
    };
    localStorage.setItem(
      "you-are-not-random:v2",
      JSON.stringify({
        schemaVersion: 2,
        totalRounds: 3,
        storedRoundCount: 3,
        latestRoundId: "legacy-three",
        state: legacyState,
      }),
    );
    rounds.forEach((round, index) => {
      localStorage.setItem(
        `you-are-not-random:v2:round:${index}`,
        JSON.stringify(round),
      );
    });

    const migrated = loadState(defaults);
    expect(migrated.learningStats.totalRounds).toBe(3);
    expect(migrated.challenge.baseline.totalRounds).toBe(3);
    expect(migrated.challenge.result).toBeNull();
    expect(migrated.activeView).toBe("play");
  });

  it("restores a frozen result and later cumulative rounds on reload", () => {
    const rounds = Array.from({ length: 65 }, (_, index) =>
      validRound(`round-${index}`),
    );
    const at50 = stateWithRounds(rounds.slice(0, 50));
    const completed = advanceChallenge(
      defaults.challenge,
      at50.learningStats,
      weights,
      123,
    );
    const at65 = stateWithRounds(rounds, {
      challenge: { ...completed, status: "continued" },
      activeView: "lab",
    });

    saveState(at65);
    const restored = loadState(defaults);
    expect(restored.learningStats.totalRounds).toBe(65);
    expect(restored.challenge.status).toBe("result");
    expect(restored.challenge.result).toEqual(completed.result);
    expect(restored.activeView).toBe("play");
  });

  it("falls back safely for malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");
    expect(loadState(defaults)).toEqual(defaults);
  });

  it("falls back safely for an unknown schema version", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 999, state: defaults }),
    );
    expect(loadState(defaults)).toEqual(defaults);
  });

  it("falls back for incompatible expert vectors", () => {
    saveState(defaults);
    const envelope = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      state?: { expertWeights?: number[] };
    };
    if (envelope.state !== undefined) {
      envelope.state.expertWeights = [1];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    expect(loadState(defaults)).toEqual(defaults);
  });

  it("writes one round slot for a new round and none for settings-only changes", () => {
    const calls: string[] = [];
    const trackingStorage = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => {
        calls.push(key);
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => localStorage.removeItem(key),
    };
    saveState(defaults, trackingStorage);
    calls.length = 0;

    const oneRound = stateWithRounds([validRound("one")]);
    saveState(oneRound, trackingStorage);
    expect(calls).toEqual([roundStorageKey(0), STORAGE_KEY]);

    calls.length = 0;
    saveState({ ...oneRound, alpha: 0.12 }, trackingStorage);
    expect(calls).toEqual([STORAGE_KEY]);
  });

  it("uses fixed circular slot keys after 2,000 rounds", () => {
    const first = validRound("first");
    saveState(stateWithRounds([first]));
    const wrapped = validRound("wrapped", "rock");
    const baseStats = buildLearningStats([wrapped]);
    saveState({
      ...stateWithRounds([wrapped]),
      learningStats: {
        ...baseStats,
        totalRounds: MAX_STORED_ROUNDS + 1,
      },
    });
    expect(localStorage.getItem(roundStorageKey(0))).toContain("wrapped");
    expect(roundStorageKey(MAX_STORED_ROUNDS)).toBe(roundStorageKey(0));
  });

  it("falls back when a stored round slot is malformed", () => {
    saveState(stateWithRounds([validRound("one")]));
    localStorage.setItem(roundStorageKey(0), "{bad-round");
    expect(loadState(defaults)).toEqual(defaults);
  });

  it("removes metadata and ring slots without touching unrelated storage", () => {
    localStorage.setItem("other-app", "keep");
    saveState(stateWithRounds([validRound("one")]));
    clearSavedState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(roundStorageKey(0))).toBeNull();
    expect(localStorage.getItem("other-app")).toBe("keep");
  });
});
