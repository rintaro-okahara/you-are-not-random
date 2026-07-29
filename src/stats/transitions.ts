import { HANDS } from "../domain/rps";
import { normalizeProbability } from "../domain/probability";
import type { Hand, ProbabilityVector } from "../domain/types";
import {
  getMarkovCounts,
  type LearningStats,
} from "../learning/learningStats";

export interface TransitionRow {
  readonly fromHand: Hand;
  readonly probabilities: ProbabilityVector;
  readonly sampleCount: number;
}

export function calculateTransitions(
  stats: LearningStats,
): readonly TransitionRow[] {
  return HANDS.map((fromHand) => {
    const counts = getMarkovCounts(stats, [fromHand]);
    return {
      fromHand,
      probabilities: normalizeProbability([
        counts[0] + 1,
        counts[1] + 1,
        counts[2] + 1,
      ]),
      sampleCount: counts[0] + counts[1] + counts[2],
    };
  });
}
