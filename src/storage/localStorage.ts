import { isProbabilityVector } from "../domain/probability";
import { isHand } from "../domain/rps";
import type { Reward, RoundRecord } from "../domain/types";
import { EXPERTS } from "../learning/experts";
import type {
  CountVector,
  LearningStats,
  MarkovTable,
} from "../learning/learningStats";
import type { RegretStats } from "../learning/regret";

export const STORAGE_KEY = "you-are-not-random:v2";
export const SCHEMA_VERSION = 2;
export const MAX_STORED_ROUNDS = 2_000;

const LEGACY_STORAGE_KEY = "you-are-not-random:v1";
const RECENT_HISTORY_LIMIT = 15;
const ROUND_KEY_PREFIX = `${STORAGE_KEY}:round:`;

export interface PersistedAppState {
  readonly recentHistory: readonly RoundRecord[];
  readonly learningStats: LearningStats;
  readonly regretStats: RegretStats;
  readonly expertWeights: readonly number[];
  readonly alpha: number;
  readonly learningEnabled: boolean;
}

interface StoredState {
  readonly learningStats: LearningStats;
  readonly regretStats: RegretStats;
  readonly expertWeights: readonly number[];
  readonly alpha: number;
  readonly learningEnabled: boolean;
}

interface StoredEnvelope {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly totalRounds: number;
  readonly storedRoundCount: number;
  readonly latestRoundId: string | null;
  readonly state: StoredState;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function roundStorageKey(sequence: number): string {
  const slot =
    ((Math.trunc(sequence) % MAX_STORED_ROUNDS) + MAX_STORED_ROUNDS) %
    MAX_STORED_ROUNDS;
  return `${ROUND_KEY_PREFIX}${slot}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isFiniteNumberArray(
  value: unknown,
  length: number,
  allowNegative: boolean,
): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(
      (item) =>
        typeof item === "number" &&
        Number.isFinite(item) &&
        (allowNegative || item >= 0),
    )
  );
}

function isCountVector(value: unknown): value is CountVector {
  return isFiniteNumberArray(value, 3, false);
}

function isReward(value: unknown): value is Reward {
  return value === -1 || value === 0 || value === 1;
}

function isMarkovTable(value: unknown): value is MarkovTable {
  const table = asRecord(value);
  return (
    table !== null &&
    Object.values(table).every((counts) => isCountVector(counts))
  );
}

function isLastRoundSummary(value: unknown): boolean {
  if (value === null) {
    return true;
  }
  const summary = asRecord(value);
  return (
    summary !== null &&
    isHand(summary.humanHand) &&
    isHand(summary.aiHand) &&
    isReward(summary.actualReward)
  );
}

function isLearningStats(value: unknown): value is LearningStats {
  const stats = asRecord(value);
  return (
    stats !== null &&
    isNonNegativeInteger(stats.totalRounds) &&
    isCountVector(stats.globalCounts) &&
    isCountVector(stats.recent5Counts) &&
    isCountVector(stats.recent10Counts) &&
    isCountVector(stats.recent20Counts) &&
    isCountVector(stats.decayedCounts) &&
    Array.isArray(stats.markovCounts) &&
    stats.markovCounts.length === 3 &&
    stats.markovCounts.every(isMarkovTable) &&
    Array.isArray(stats.recentHands) &&
    stats.recentHands.length <= 20 &&
    stats.recentHands.every(isHand) &&
    Array.isArray(stats.recentRewards) &&
    stats.recentRewards.length <= 10 &&
    stats.recentRewards.every(isReward) &&
    isLastRoundSummary(stats.lastRound) &&
    isNonNegativeInteger(stats.handStreakLength) &&
    isNonNegativeInteger(stats.aiWins) &&
    isNonNegativeInteger(stats.humanWins) &&
    isNonNegativeInteger(stats.draws) &&
    isReward(stats.resultStreakReward) &&
    isNonNegativeInteger(stats.resultStreakCount)
  );
}

function isRegretStats(value: unknown): value is RegretStats {
  const stats = asRecord(value);
  return (
    stats !== null &&
    isNonNegativeInteger(stats.learningRounds) &&
    isFiniteNumberArray(
      stats.expertCumulativeRewards,
      EXPERTS.length,
      true,
    ) &&
    typeof stats.algorithmExpectedReward === "number" &&
    Number.isFinite(stats.algorithmExpectedReward)
  );
}

function isStoredProbability(value: unknown): boolean {
  return Array.isArray(value) && isProbabilityVector(value);
}

function isRoundRecord(value: unknown): value is RoundRecord {
  const record = asRecord(value);
  if (record === null) {
    return false;
  }
  return (
    typeof record.id === "string" &&
    typeof record.timestamp === "number" &&
    Number.isFinite(record.timestamp) &&
    isHand(record.humanHand) &&
    isHand(record.aiHand) &&
    isStoredProbability(record.aiDistribution) &&
    isFiniteNumberArray(
      record.expertWeightsBefore,
      EXPERTS.length,
      false,
    ) &&
    isFiniteNumberArray(record.expertRewards, EXPERTS.length, true) &&
    typeof record.aiExpectedReward === "number" &&
    Number.isFinite(record.aiExpectedReward) &&
    isReward(record.actualReward) &&
    typeof record.learningEnabled === "boolean"
  );
}

function isNormalizedWeights(value: unknown): value is readonly number[] {
  return (
    isFiniteNumberArray(value, EXPERTS.length, false) &&
    Math.abs(value.reduce((sum, weight) => sum + weight, 0) - 1) <=
      1e-6
  );
}

function isStoredState(value: unknown): value is StoredState {
  const state = asRecord(value);
  return (
    state !== null &&
    isLearningStats(state.learningStats) &&
    isRegretStats(state.regretStats) &&
    isNormalizedWeights(state.expertWeights) &&
    typeof state.alpha === "number" &&
    Number.isFinite(state.alpha) &&
    state.alpha >= 0 &&
    state.alpha <= 0.2 &&
    typeof state.learningEnabled === "boolean"
  );
}

function isStoredEnvelope(value: unknown): value is StoredEnvelope {
  const envelope = asRecord(value);
  return (
    envelope !== null &&
    envelope.schemaVersion === SCHEMA_VERSION &&
    isNonNegativeInteger(envelope.totalRounds) &&
    isNonNegativeInteger(envelope.storedRoundCount) &&
    envelope.storedRoundCount <= MAX_STORED_ROUNDS &&
    (envelope.latestRoundId === null ||
      typeof envelope.latestRoundId === "string") &&
    isStoredState(envelope.state) &&
    envelope.state.learningStats.totalRounds === envelope.totalRounds
  );
}

function parseEnvelope(raw: string | null): StoredEnvelope | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isStoredEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function storedState(state: PersistedAppState): StoredState {
  return {
    learningStats: state.learningStats,
    regretStats: state.regretStats,
    expertWeights: state.expertWeights,
    alpha: state.alpha,
    learningEnabled: state.learningEnabled,
  };
}

export function loadState(
  defaults: PersistedAppState,
  storage: StorageLike | null = browserStorage(),
): PersistedAppState {
  if (storage === null) {
    return defaults;
  }

  try {
    const envelope = parseEnvelope(storage.getItem(STORAGE_KEY));
    if (envelope === null) {
      return defaults;
    }

    const recentCount = Math.min(
      envelope.storedRoundCount,
      RECENT_HISTORY_LIMIT,
    );
    const firstSequence = envelope.totalRounds - recentCount;
    const recentHistory: RoundRecord[] = [];
    for (
      let sequence = firstSequence;
      sequence < envelope.totalRounds;
      sequence += 1
    ) {
      const rawRound = storage.getItem(roundStorageKey(sequence));
      const parsedRound =
        rawRound === null ? null : (JSON.parse(rawRound) as unknown);
      if (!isRoundRecord(parsedRound)) {
        return defaults;
      }
      recentHistory.push(parsedRound);
    }

    return {
      ...envelope.state,
      recentHistory,
    };
  } catch {
    return defaults;
  }
}

export function saveState(
  state: PersistedAppState,
  storage: StorageLike | null = browserStorage(),
): boolean {
  if (storage === null) {
    return false;
  }

  try {
    const previous = parseEnvelope(storage.getItem(STORAGE_KEY));
    const latestRound = state.recentHistory.at(-1);
    let storedRoundCount = previous?.storedRoundCount ?? 0;

    if (previous === null) {
      const firstSequence =
        state.learningStats.totalRounds - state.recentHistory.length;
      state.recentHistory.forEach((round, index) => {
        storage.setItem(
          roundStorageKey(firstSequence + index),
          JSON.stringify(round),
        );
      });
      storedRoundCount = Math.min(
        state.recentHistory.length,
        MAX_STORED_ROUNDS,
      );
    } else if (
      latestRound !== undefined &&
      previous.latestRoundId !== latestRound.id
    ) {
      storage.setItem(
        roundStorageKey(state.learningStats.totalRounds - 1),
        JSON.stringify(latestRound),
      );
      storedRoundCount = Math.min(
        previous.storedRoundCount + 1,
        MAX_STORED_ROUNDS,
      );
    } else if (state.learningStats.totalRounds === 0) {
      storedRoundCount = 0;
    }

    const envelope: StoredEnvelope = {
      schemaVersion: SCHEMA_VERSION,
      totalRounds: state.learningStats.totalRounds,
      storedRoundCount,
      latestRoundId: latestRound?.id ?? null,
      state: storedState(state),
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedState(
  storage: StorageLike | null = browserStorage(),
): void {
  if (storage === null) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(LEGACY_STORAGE_KEY);
    for (let slot = 0; slot < MAX_STORED_ROUNDS; slot += 1) {
      storage.removeItem(roundStorageKey(slot));
    }
  } catch {
    // Storage can be blocked; in-memory reset must still succeed.
  }
}
