import { handToIndex } from "../domain/rps";
import { normalizeProbability, UNIFORM_PROBABILITY } from "../domain/probability";
import type { Hand, ProbabilityVector } from "../domain/types";
import {
  getMarkovCounts,
  type LastRoundSummary,
  type LearningStats,
} from "./learningStats";
import type { Expert } from "./types";

const LAPLACE_PRIOR = 1;
const MARKOV_MIN_OBSERVATIONS = 2;

export function smoothedHandPrediction(hand: Hand): ProbabilityVector {
  const values: [number, number, number] = [0.1, 0.1, 0.1];
  values[handToIndex(hand)] = 0.8;
  return values;
}

export function predictionAvoiding(hand: Hand): ProbabilityVector {
  const values: [number, number, number] = [0.45, 0.45, 0.45];
  values[handToIndex(hand)] = 0.1;
  return normalizeProbability(values);
}

export function laplaceFrequency(
  stats: LearningStats,
  limit?: number,
): ProbabilityVector {
  const counts =
    limit === 5
      ? stats.recent5Counts
      : limit === 10
        ? stats.recent10Counts
        : limit === 20
          ? stats.recent20Counts
          : stats.globalCounts;
  return normalizeProbability([
    counts[0] + LAPLACE_PRIOR,
    counts[1] + LAPLACE_PRIOR,
    counts[2] + LAPLACE_PRIOR,
  ]);
}

export function decayedFrequency(stats: LearningStats): ProbabilityVector {
  return normalizeProbability([
    stats.decayedCounts[0] + LAPLACE_PRIOR,
    stats.decayedCounts[1] + LAPLACE_PRIOR,
    stats.decayedCounts[2] + LAPLACE_PRIOR,
  ]);
}

export function lastRound(
  stats: LearningStats,
): LastRoundSummary | undefined {
  return stats.lastRound ?? undefined;
}

export function repeatedTailLength(stats: LearningStats): number {
  return stats.handStreakLength;
}

function markovAtOrder(
  stats: LearningStats,
  order: number,
): ProbabilityVector | undefined {
  if (stats.recentHands.length < order) {
    return undefined;
  }

  const context = stats.recentHands.slice(-order);
  const counts = getMarkovCounts(stats, context);
  const observations = counts[0] + counts[1] + counts[2];

  if (observations < MARKOV_MIN_OBSERVATIONS) {
    return undefined;
  }
  return normalizeProbability([
    counts[0] + LAPLACE_PRIOR,
    counts[1] + LAPLACE_PRIOR,
    counts[2] + LAPLACE_PRIOR,
  ]);
}

export function markovPrediction(
  stats: LearningStats,
  maxOrder: number,
): ProbabilityVector {
  for (let order = maxOrder; order >= 1; order -= 1) {
    const prediction = markovAtOrder(stats, order);
    if (prediction !== undefined) {
      return prediction;
    }
  }
  return stats.totalRounds === 0
    ? UNIFORM_PROBABILITY
    : laplaceFrequency(stats);
}

export function periodPrediction(
  stats: LearningStats,
  period: number,
): ProbabilityVector {
  const prior = stats.recentHands.at(-period);
  return prior === undefined
    ? laplaceFrequency(stats)
    : smoothedHandPrediction(prior);
}

export function buildExpert(
  id: string,
  name: string,
  shortDescription: string,
  suspicionText: string,
  predictHuman: (
    stats: LearningStats,
  ) => ProbabilityVector,
): Expert {
  return { id, name, shortDescription, suspicionText, predictHuman };
}
