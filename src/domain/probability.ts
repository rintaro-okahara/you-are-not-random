import type { ProbabilityVector } from "./types";

export const UNIFORM_PROBABILITY: ProbabilityVector = [1 / 3, 1 / 3, 1 / 3];

const PROBABILITY_TOLERANCE = 1e-9;

export function normalizeProbability(
  values: readonly [number, number, number],
): ProbabilityVector {
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return UNIFORM_PROBABILITY;
  }

  const sum = values[0] + values[1] + values[2];
  if (!Number.isFinite(sum) || sum <= 0) {
    return UNIFORM_PROBABILITY;
  }

  return [values[0] / sum, values[1] / sum, values[2] / sum];
}

export function isProbabilityVector(
  value: readonly number[],
): value is ProbabilityVector {
  if (value.length !== 3) {
    return false;
  }

  const sum = value.reduce((total, item) => total + item, 0);
  return (
    value.every((item) => Number.isFinite(item) && item >= 0) &&
    Math.abs(sum - 1) <= PROBABILITY_TOLERANCE
  );
}
