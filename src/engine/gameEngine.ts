import { getPayoff, rewardVectorForHuman } from "../domain/rps";
import { UNIFORM_PROBABILITY } from "../domain/probability";
import type {
  Hand,
  ProbabilityVector,
  RoundRecord,
} from "../domain/types";
import { EXPERTS } from "../learning/experts";
import {
  DEFAULT_ETA,
  mixDistributions,
  normalizeWeights,
  scoreExperts,
  uniformWeights,
  updateFixedShare,
} from "../learning/hedge";
import { predictedHumanToAiDistribution } from "../learning/prediction";
import { sampleHand, type RandomSource, secureRandom } from "./sampling";

export const MAX_HISTORY = 2_000;

export interface PendingRound {
  readonly aiHand: Hand;
  readonly aiDistribution: ProbabilityVector;
  readonly expertActionDistributions: readonly ProbabilityVector[];
  readonly expertWeightsBefore: readonly number[];
  readonly learningEnabled: boolean;
}

export interface PlayRoundOptions {
  readonly pending: PendingRound;
  readonly humanHand: Hand;
  readonly history: readonly RoundRecord[];
  readonly alpha: number;
  readonly eta?: number;
  readonly now?: () => number;
  readonly createId?: () => string;
}

export interface PlayRoundResult {
  readonly record: RoundRecord;
  readonly history: readonly RoundRecord[];
  readonly nextWeights: readonly number[];
}

function safeWeights(weights: readonly number[]): readonly number[] {
  return weights.length === EXPERTS.length
    ? normalizeWeights(weights)
    : uniformWeights(EXPERTS.length);
}

export function preparePendingRound(
  history: readonly RoundRecord[],
  expertWeights: readonly number[],
  learningEnabled: boolean,
  random: RandomSource = secureRandom,
): PendingRound {
  const weights = safeWeights(expertWeights);
  const expertActionDistributions = EXPERTS.map((expert) =>
    predictedHumanToAiDistribution(expert.predictHuman(history)),
  );
  const aiDistribution = learningEnabled
    ? mixDistributions(weights, expertActionDistributions)
    : UNIFORM_PROBABILITY;

  return {
    aiHand: sampleHand(aiDistribution, random),
    aiDistribution,
    expertActionDistributions,
    expertWeightsBefore: weights,
    learningEnabled,
  };
}

function defaultId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `round-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function playPendingRound({
  pending,
  humanHand,
  history,
  alpha,
  eta = DEFAULT_ETA,
  now = Date.now,
  createId = defaultId,
}: PlayRoundOptions): PlayRoundResult {
  const rewardVector = rewardVectorForHuman(humanHand);
  const expertRewards = scoreExperts(
    pending.expertActionDistributions,
    rewardVector,
  );
  const aiExpectedReward =
    pending.aiDistribution[0] * rewardVector[0] +
    pending.aiDistribution[1] * rewardVector[1] +
    pending.aiDistribution[2] * rewardVector[2];
  const nextWeights = pending.learningEnabled
    ? updateFixedShare(
        pending.expertWeightsBefore,
        expertRewards,
        eta,
        alpha,
      )
    : pending.expertWeightsBefore;

  const record: RoundRecord = {
    id: createId(),
    timestamp: now(),
    humanHand,
    aiHand: pending.aiHand,
    aiDistribution: pending.aiDistribution,
    expertWeightsBefore: pending.expertWeightsBefore,
    expertRewards,
    aiExpectedReward,
    actualReward: getPayoff(pending.aiHand, humanHand),
    learningEnabled: pending.learningEnabled,
  };

  return {
    record,
    history: [...history, record].slice(-MAX_HISTORY),
    nextWeights,
  };
}
