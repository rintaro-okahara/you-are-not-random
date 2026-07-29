import { describe, expect, it } from "vitest";
import { EXPERTS } from "../learning/experts";
import { uniformWeights } from "../learning/hedge";
import { makeRound } from "../test/testHelpers";
import {
  STORAGE_KEY,
  clearSavedState,
  loadState,
  saveState,
  type PersistedAppState,
} from "./localStorage";

const defaults: PersistedAppState = {
  history: [],
  expertWeights: uniformWeights(EXPERTS.length),
  alpha: 0.03,
  learningEnabled: true,
};

describe("versioned localStorage", () => {
  it("saves and restores valid state", () => {
    const state: PersistedAppState = {
      history: [
        makeRound("paper", {
          expertWeightsBefore: uniformWeights(EXPERTS.length),
          expertRewards: uniformWeights(EXPERTS.length),
        }),
      ],
      expertWeights: uniformWeights(EXPERTS.length),
      alpha: 0.12,
      learningEnabled: false,
    };
    saveState(state);
    expect(loadState(defaults)).toEqual(state);
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        state: { ...defaults, expertWeights: [1] },
      }),
    );
    expect(loadState(defaults)).toEqual(defaults);
  });

  it("removes the app key without touching unrelated storage", () => {
    localStorage.setItem("other-app", "keep");
    saveState(defaults);
    clearSavedState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("other-app")).toBe("keep");
  });
});
