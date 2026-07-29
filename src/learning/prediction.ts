import { PAYOFF_MATRIX } from "../domain/rps";
import {
  normalizeProbability,
  UNIFORM_PROBABILITY,
} from "../domain/probability";
import type { ProbabilityVector } from "../domain/types";

export const BEST_RESPONSE_BETA = 5;
export const EXPLORATION_EPSILON = 0.05;

export function stableSoftmax(
  values: readonly [number, number, number],
): ProbabilityVector {
  if (values.some((value) => !Number.isFinite(value))) {
    return UNIFORM_PROBABILITY;
  }
  const maximum = Math.max(...values);
  return normalizeProbability([
    Math.exp(values[0] - maximum),
    Math.exp(values[1] - maximum),
    Math.exp(values[2] - maximum),
  ]);
}

export function expectedPayoffs(
  predictedHuman: ProbabilityVector,
): ProbabilityVector {
  return [
    PAYOFF_MATRIX[0][0] * predictedHuman[0] +
      PAYOFF_MATRIX[0][1] * predictedHuman[1] +
      PAYOFF_MATRIX[0][2] * predictedHuman[2],
    PAYOFF_MATRIX[1][0] * predictedHuman[0] +
      PAYOFF_MATRIX[1][1] * predictedHuman[1] +
      PAYOFF_MATRIX[1][2] * predictedHuman[2],
    PAYOFF_MATRIX[2][0] * predictedHuman[0] +
      PAYOFF_MATRIX[2][1] * predictedHuman[1] +
      PAYOFF_MATRIX[2][2] * predictedHuman[2],
  ];
}

export function predictedHumanToAiDistribution(
  predictedHuman: ProbabilityVector,
  beta = BEST_RESPONSE_BETA,
  epsilon = EXPLORATION_EPSILON,
): ProbabilityVector {
  const payoffs = expectedPayoffs(predictedHuman);
  const response = stableSoftmax([
    beta * payoffs[0],
    beta * payoffs[1],
    beta * payoffs[2],
  ]);
  const safeEpsilon = Math.min(1, Math.max(0, epsilon));

  return normalizeProbability([
    (1 - safeEpsilon) * response[0] +
      safeEpsilon * UNIFORM_PROBABILITY[0],
    (1 - safeEpsilon) * response[1] +
      safeEpsilon * UNIFORM_PROBABILITY[1],
    (1 - safeEpsilon) * response[2] +
      safeEpsilon * UNIFORM_PROBABILITY[2],
  ]);
}
