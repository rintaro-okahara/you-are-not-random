import type { RoundRecord } from "../domain/types";
import {
  createChallengeState,
  type ChallengeState,
} from "../challenge/challenge";
import {
  preparePendingRound,
  type PendingRound,
} from "../engine/gameEngine";
import { type RandomSource, secureRandom } from "../engine/sampling";
import { EXPERTS } from "../learning/experts";
import { DEFAULT_ALPHA, uniformWeights } from "../learning/hedge";
import {
  createLearningStats,
  type LearningStats,
} from "../learning/learningStats";
import {
  createRegretStats,
  type RegretStats,
} from "../learning/regret";
import {
  loadState,
  type PersistedAppState,
} from "../storage/localStorage";

export interface AppState {
  readonly recentHistory: readonly RoundRecord[];
  readonly learningStats: LearningStats;
  readonly regretStats: RegretStats;
  readonly expertWeights: readonly number[];
  readonly alpha: number;
  readonly learningEnabled: boolean;
  readonly pendingRound: PendingRound;
  readonly challenge: ChallengeState;
  readonly activeView: "play" | "lab";
  readonly celebrateVictory: boolean;
}

const defaultLearningStats = createLearningStats();

export const DEFAULT_PERSISTED_STATE: PersistedAppState = {
  recentHistory: [],
  learningStats: defaultLearningStats,
  regretStats: createRegretStats(EXPERTS.length),
  expertWeights: uniformWeights(EXPERTS.length),
  alpha: DEFAULT_ALPHA,
  learningEnabled: true,
  challenge: createChallengeState(defaultLearningStats),
  activeView: "play",
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
    celebrateVictory: false,
    pendingRound: preparePendingRound(
      persisted.learningStats,
      persisted.expertWeights,
      persisted.learningEnabled,
      random,
    ),
  };
}

export function toPersistedState(state: AppState): PersistedAppState {
  return {
    recentHistory: state.recentHistory,
    learningStats: state.learningStats,
    regretStats: state.regretStats,
    expertWeights: state.expertWeights,
    alpha: state.alpha,
    learningEnabled: state.learningEnabled,
    challenge: state.challenge,
    activeView: state.activeView,
  };
}
