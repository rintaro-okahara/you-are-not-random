import { HANDS, handToIndex } from "../domain/rps";
import { normalizeProbability } from "../domain/probability";
import type { Hand, ProbabilityVector, RoundRecord } from "../domain/types";

export interface TransitionRow {
  readonly fromHand: Hand;
  readonly probabilities: ProbabilityVector;
  readonly sampleCount: number;
}

export function calculateTransitions(
  history: readonly RoundRecord[],
): readonly TransitionRow[] {
  const counts = HANDS.map(() => [1, 1, 1] as [number, number, number]);
  const sampleCounts = HANDS.map(() => 0);

  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1]?.humanHand;
    const next = history[index]?.humanHand;
    if (previous === undefined || next === undefined) {
      continue;
    }
    const fromIndex = handToIndex(previous);
    const toIndex = handToIndex(next);
    const row = counts[fromIndex];
    if (row !== undefined) {
      row[toIndex] += 1;
    }
    sampleCounts[fromIndex] = (sampleCounts[fromIndex] ?? 0) + 1;
  }

  return HANDS.map((fromHand, index) => ({
    fromHand,
    probabilities: normalizeProbability(counts[index] ?? [1, 1, 1]),
    sampleCount: sampleCounts[index] ?? 0,
  }));
}
