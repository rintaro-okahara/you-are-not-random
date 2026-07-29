import type { RoundRecord } from "../domain/types";
import {
  preparePendingRound,
  type PendingRound,
} from "../engine/gameEngine";
import { type RandomSource, secureRandom } from "../engine/sampling";
import { EXPERTS } from "../learning/experts";
import { DEFAULT_ALPHA, uniformWeights } from "../learning/hedge";
import {
  loadState,
  type PersistedAppState,
} from "../storage/localStorage";

export interface AppState {
  readonly history: readonly RoundRecord[];
  readonly expertWeights: readonly number[];
  readonly alpha: number;
  readonly learningEnabled: boolean;
  readonly pendingRound: PendingRound;
}

export const DEFAULT_PERSISTED_STATE: PersistedAppState = {
  history: [],
  expertWeights: uniformWeights(EXPERTS.length),
  alpha: DEFAULT_ALPHA,
  learningEnabled: true,
};

interface InitialStateOptions {
  readonly random?: RandomSource;
  readonly persisted?: PersistedAppState;
}

export function createInitialState(
  options: InitialStateOptions = {},
): AppState {
  const persisted = options.persisted ?? loadState(DEFAULT_PERSISTED_STATE);
  const random = options.random ?? secureRandom;
  return {
    ...persisted,
    pendingRound: preparePendingRound(
      persisted.history,
      persisted.expertWeights,
      persisted.learningEnabled,
      random,
    ),
  };
}

export function toPersistedState(state: AppState): PersistedAppState {
  return {
    history: state.history,
    expertWeights: state.expertWeights,
    alpha: state.alpha,
    learningEnabled: state.learningEnabled,
  };
}
