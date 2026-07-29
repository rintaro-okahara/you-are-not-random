import { isProbabilityVector } from "../domain/probability";
import { isHand } from "../domain/rps";
import type { RoundRecord } from "../domain/types";
import { MAX_HISTORY } from "../engine/gameEngine";
import { EXPERTS } from "../learning/experts";

export const STORAGE_KEY = "you-are-not-random:v1";
export const SCHEMA_VERSION = 1;

export interface PersistedAppState {
  readonly history: readonly RoundRecord[];
  readonly expertWeights: readonly number[];
  readonly alpha: number;
  readonly learningEnabled: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
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
    (record.actualReward === -1 ||
      record.actualReward === 0 ||
      record.actualReward === 1) &&
    typeof record.learningEnabled === "boolean"
  );
}

function isPersistedAppState(value: unknown): value is PersistedAppState {
  const state = asRecord(value);
  if (state === null) {
    return false;
  }
  return (
    Array.isArray(state.history) &&
    state.history.every(isRoundRecord) &&
    isFiniteNumberArray(state.expertWeights, EXPERTS.length, false) &&
    Math.abs(
      (state.expertWeights as readonly number[]).reduce(
        (sum, weight) => sum + weight,
        0,
      ) - 1,
    ) <= 1e-6 &&
    typeof state.alpha === "number" &&
    Number.isFinite(state.alpha) &&
    state.alpha >= 0 &&
    state.alpha <= 0.2 &&
    typeof state.learningEnabled === "boolean"
  );
}

export function loadState(
  defaults: PersistedAppState,
  storage: StorageLike | null = browserStorage(),
): PersistedAppState {
  if (storage === null) {
    return defaults;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
      return defaults;
    }
    const envelope = asRecord(JSON.parse(raw) as unknown);
    if (
      envelope === null ||
      envelope.schemaVersion !== SCHEMA_VERSION ||
      !isPersistedAppState(envelope.state)
    ) {
      return defaults;
    }
    return {
      ...envelope.state,
      history: envelope.state.history.slice(-MAX_HISTORY),
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
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, state }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearSavedState(
  storage: StorageLike | null = browserStorage(),
): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; in-memory reset must still succeed.
  }
}
