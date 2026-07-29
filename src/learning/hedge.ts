import {
  normalizeProbability,
  UNIFORM_PROBABILITY,
} from "../domain/probability";
import type { ProbabilityVector } from "../domain/types";

export const DEFAULT_ETA = 0.25;
export const DEFAULT_ALPHA = 0.03;

export function uniformWeights(count: number): readonly number[] {
  if (!Number.isInteger(count) || count <= 0) {
    return [];
  }
  return Array.from({ length: count }, () => 1 / count);
}

export function normalizeWeights(
  values: readonly number[],
): readonly number[] {
  if (
    values.length === 0 ||
    values.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    return uniformWeights(values.length);
  }
  const sum = values.reduce((total, value) => total + value, 0);
  if (!Number.isFinite(sum) || sum <= 0) {
    return uniformWeights(values.length);
  }
  if (Math.abs(sum - 1) <= 1e-12) {
    return [...values];
  }
  return values.map((value) => value / sum);
}

export function mixDistributions(
  weights: readonly number[],
  distributions: readonly ProbabilityVector[],
): ProbabilityVector {
  if (distributions.length === 0) {
    return UNIFORM_PROBABILITY;
  }

  const alignedWeights =
    weights.length === distributions.length
      ? normalizeWeights(weights)
      : uniformWeights(distributions.length);
  const mixed: [number, number, number] = [0, 0, 0];

  distributions.forEach((distribution, expertIndex) => {
    const weight = alignedWeights[expertIndex] ?? 0;
    mixed[0] += weight * distribution[0];
    mixed[1] += weight * distribution[1];
    mixed[2] += weight * distribution[2];
  });

  return normalizeProbability(mixed);
}

export function scoreExperts(
  expertDistributions: readonly ProbabilityVector[],
  rewardVector: readonly [number, number, number],
): readonly number[] {
  return expertDistributions.map(
    (distribution) =>
      distribution[0] * rewardVector[0] +
      distribution[1] * rewardVector[1] +
      distribution[2] * rewardVector[2],
  );
}

export function updateFixedShare(
  currentWeights: readonly number[],
  rewards: readonly number[],
  eta = DEFAULT_ETA,
  alpha = DEFAULT_ALPHA,
): readonly number[] {
  if (currentWeights.length === 0) {
    return [];
  }
  if (currentWeights.length !== rewards.length) {
    return uniformWeights(currentWeights.length);
  }

  const normalized = normalizeWeights(currentWeights);
  const safeEta = Number.isFinite(eta) ? eta : DEFAULT_ETA;
  const safeAlpha = Number.isFinite(alpha)
    ? Math.min(1, Math.max(0, alpha))
    : DEFAULT_ALPHA;
  const logPosteriors = normalized.map((weight, index) => {
    const reward = rewards[index];
    const safeReward = reward !== undefined && Number.isFinite(reward) ? reward : 0;
    return weight > 0 ? Math.log(weight) + safeEta * safeReward : -Infinity;
  });
  const maxLog = Math.max(...logPosteriors);

  const posterior = Number.isFinite(maxLog)
    ? normalizeWeights(
        logPosteriors.map((value) =>
          Number.isFinite(value) ? Math.exp(value - maxLog) : 0,
        ),
      )
    : uniformWeights(currentWeights.length);
  const shared = posterior.map(
    (weight) => (1 - safeAlpha) * weight + safeAlpha / posterior.length,
  );

  return normalizeWeights(shared);
}
