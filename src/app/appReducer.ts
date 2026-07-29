import type { Hand } from "../domain/types";
import { playPendingRound, preparePendingRound } from "../engine/gameEngine";
import { type RandomSource, secureRandom } from "../engine/sampling";
import type { PersistedAppState } from "../storage/localStorage";
import {
  createInitialState,
  DEFAULT_PERSISTED_STATE,
  type AppState,
} from "./initialState";

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
      const result = playPendingRound({
        pending: state.pendingRound,
        humanHand: action.humanHand,
        history: state.history,
        alpha: state.alpha,
        now: action.now,
        createId: action.createId,
      });
      return {
        ...state,
        history: result.history,
        expertWeights: result.nextWeights,
        pendingRound: preparePendingRound(
          result.history,
          result.nextWeights,
          state.learningEnabled,
          action.random ?? secureRandom,
        ),
      };
    }
    case "set-learning":
      return {
        ...state,
        learningEnabled: action.enabled,
        pendingRound: preparePendingRound(
          state.history,
          state.expertWeights,
          action.enabled,
          action.random ?? secureRandom,
        ),
      };
    case "set-alpha":
      return { ...state, alpha: clampAlpha(action.alpha) };
    case "reset": {
      const defaults: PersistedAppState = {
        ...DEFAULT_PERSISTED_STATE,
        history: [],
      };
      return createInitialState({
        persisted: defaults,
        random: action.random ?? secureRandom,
      });
    }
  }
}
