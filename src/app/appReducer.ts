import type { Hand } from "../domain/types";
import {
  advanceChallenge,
  continueChallenge,
  createChallengeState,
  resultOutcome,
} from "../challenge/challenge";
import { playPendingRound, preparePendingRound } from "../engine/gameEngine";
import { type RandomSource, secureRandom } from "../engine/sampling";
import type { PersistedAppState } from "../storage/localStorage";
import {
  createInitialState,
  DEFAULT_PERSISTED_STATE,
  type AppState,
} from "./initialState";

export const RECENT_HISTORY_LIMIT = 15;

export type AppAction =
  | {
      readonly type: "play";
      readonly humanHand: Hand;
      readonly random?: RandomSource;
      readonly now?: () => number;
      readonly createId?: () => string;
    }
  | {
      readonly type: "set-learning";
      readonly enabled: boolean;
      readonly random?: RandomSource;
    }
  | { readonly type: "set-alpha"; readonly alpha: number }
  | { readonly type: "set-view"; readonly view: "play" | "lab" }
  | { readonly type: "continue-challenge" }
  | { readonly type: "show-challenge-result" }
  | { readonly type: "retry-challenge"; readonly random?: RandomSource }
  | { readonly type: "reset"; readonly random?: RandomSource };

function clampAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) {
    return DEFAULT_PERSISTED_STATE.alpha;
  }
  return Math.min(0.2, Math.max(0, alpha));
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "play": {
      if (state.challenge.status === "result") {
        return state;
      }
      const result = playPendingRound({
        pending: state.pendingRound,
        humanHand: action.humanHand,
        learningStats: state.learningStats,
        regretStats: state.regretStats,
        alpha: state.alpha,
        now: action.now,
        createId: action.createId,
      });
      const nextChallenge = advanceChallenge(
        state.challenge,
        result.nextLearningStats,
        result.nextWeights,
        result.record.timestamp,
      );
      return {
        ...state,
        recentHistory: [...state.recentHistory, result.record].slice(
          -RECENT_HISTORY_LIMIT,
        ),
        learningStats: result.nextLearningStats,
        regretStats: result.nextRegretStats,
        expertWeights: result.nextWeights,
        challenge: nextChallenge,
        celebrateVictory:
          state.challenge.status === "active" &&
          nextChallenge.status === "result" &&
          nextChallenge.result !== null &&
          resultOutcome(nextChallenge.result) === "human-victory",
        pendingRound: preparePendingRound(
          result.nextLearningStats,
          result.nextWeights,
          state.learningEnabled,
          action.random ?? secureRandom,
        ),
      };
    }
    case "set-learning":
      return {
        ...state,
        celebrateVictory: false,
        learningEnabled: action.enabled,
        pendingRound: preparePendingRound(
          state.learningStats,
          state.expertWeights,
          action.enabled,
          action.random ?? secureRandom,
        ),
      };
    case "set-alpha":
      return {
        ...state,
        celebrateVictory: false,
        alpha: clampAlpha(action.alpha),
      };
    case "set-view":
      return { ...state, celebrateVictory: false, activeView: action.view };
    case "continue-challenge":
      return {
        ...state,
        celebrateVictory: false,
        challenge: continueChallenge(state.challenge),
      };
    case "show-challenge-result":
      return state.challenge.result === null
        ? state
        : {
            ...state,
            celebrateVictory: false,
            activeView: "play",
            challenge: { ...state.challenge, status: "result" },
          };
    case "retry-challenge": {
      const defaults: PersistedAppState = {
        ...DEFAULT_PERSISTED_STATE,
        recentHistory: [],
        alpha: state.alpha,
        learningEnabled: state.learningEnabled,
        challenge: createChallengeState(
          DEFAULT_PERSISTED_STATE.learningStats,
        ),
      };
      return createInitialState({
        persisted: defaults,
        random: action.random ?? secureRandom,
      });
    }
    case "reset": {
      const defaults: PersistedAppState = {
        ...DEFAULT_PERSISTED_STATE,
        recentHistory: [],
      };
      return createInitialState({
        persisted: defaults,
        random: action.random ?? secureRandom,
      });
    }
  }
}
