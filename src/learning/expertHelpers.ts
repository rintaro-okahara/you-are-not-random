import { HANDS, handToIndex } from "../domain/rps";
import { normalizeProbability, UNIFORM_PROBABILITY } from "../domain/probability";
import type { Hand, ProbabilityVector, RoundRecord } from "../domain/types";

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
  history: readonly RoundRecord[],
  limit?: number,
): ProbabilityVector {
  const relevant =
    limit === undefined ? history : history.slice(Math.max(0, history.length - limit));
  const counts: [number, number, number] = [
    LAPLACE_PRIOR,
    LAPLACE_PRIOR,
    LAPLACE_PRIOR,
  ];

  for (const round of relevant) {
    counts[handToIndex(round.humanHand)] += 1;
  }
  return normalizeProbability(counts);
}

export function decayedFrequency(
  history: readonly RoundRecord[],
  decay = 0.85,
): ProbabilityVector {
  const counts: [number, number, number] = [
    LAPLACE_PRIOR,
    LAPLACE_PRIOR,
    LAPLACE_PRIOR,
  ];

  history.forEach((round, index) => {
    const age = history.length - index - 1;
    counts[handToIndex(round.humanHand)] += decay ** age;
  });
  return normalizeProbability(counts);
}

export function lastRound(
  history: readonly RoundRecord[],
): RoundRecord | undefined {
  return history.at(-1);
}

export function repeatedTailLength(history: readonly RoundRecord[]): number {
  const latest = lastRound(history)?.humanHand;
  if (latest === undefined) {
    return 0;
  }

  let length = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.humanHand !== latest) {
      break;
    }
    length += 1;
  }
  return length;
}

function contextMatches(
  history: readonly RoundRecord[],
  start: number,
  context: readonly Hand[],
): boolean {
  return context.every(
    (hand, offset) => history[start + offset]?.humanHand === hand,
  );
}

function markovAtOrder(
  history: readonly RoundRecord[],
  order: number,
): ProbabilityVector | undefined {
  if (history.length <= order) {
    return undefined;
  }

  const context = history
    .slice(history.length - order)
    .map((round) => round.humanHand);
  const counts: [number, number, number] = [0, 0, 0];
  let observations = 0;

  for (let nextIndex = order; nextIndex < history.length; nextIndex += 1) {
    const start = nextIndex - order;
    if (contextMatches(history, start, context)) {
      const nextHand = history[nextIndex]?.humanHand;
      if (nextHand !== undefined) {
        counts[handToIndex(nextHand)] += 1;
        observations += 1;
      }
    }
  }

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
  history: readonly RoundRecord[],
  maxOrder: number,
): ProbabilityVector {
  for (let order = maxOrder; order >= 1; order -= 1) {
    const prediction = markovAtOrder(history, order);
    if (prediction !== undefined) {
      return prediction;
    }
  }
  return history.length === 0
    ? UNIFORM_PROBABILITY
    : laplaceFrequency(history);
}

export function periodPrediction(
  history: readonly RoundRecord[],
  period: number,
): ProbabilityVector {
  const prior = history.at(-period);
  return prior === undefined
    ? laplaceFrequency(history)
    : smoothedHandPrediction(prior.humanHand);
}

export function buildExpert(
  id: string,
  name: string,
  shortDescription: string,
  suspicionText: string,
  predictHuman: (
    history: readonly RoundRecord[],
  ) => ProbabilityVector,
) {
  return { id, name, shortDescription, suspicionText, predictHuman };
}

export function isKnownHand(value: unknown): value is Hand {
  return HANDS.includes(value as Hand);
}
