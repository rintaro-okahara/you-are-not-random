import type { RoundRecord } from "../domain/types";

export interface RegretSummary {
  readonly learningRounds: number;
  readonly bestExpertIndex: number | null;
  readonly expertCumulativeRewards: readonly number[];
  readonly bestExpertReward: number;
  readonly algorithmExpectedReward: number;
  readonly empiricalRegret: number;
  readonly perRoundRegret: number;
}

export function calculateRegret(
  history: readonly RoundRecord[],
): RegretSummary {
  const learningRounds = history.filter(
    (round) => round.learningEnabled && round.expertRewards.length > 0,
  );
  const expertCount = learningRounds.reduce(
    (maximum, round) => Math.max(maximum, round.expertRewards.length),
    0,
  );
  const expertCumulativeRewards = Array.from(
    { length: expertCount },
    () => 0,
  );
  let algorithmExpectedReward = 0;

  for (const round of learningRounds) {
    round.expertRewards.forEach((reward, index) => {
      expertCumulativeRewards[index] =
        (expertCumulativeRewards[index] ?? 0) + reward;
      algorithmExpectedReward +=
        (round.expertWeightsBefore[index] ?? 0) * reward;
    });
  }

  let bestExpertIndex: number | null = null;
  let bestExpertReward = 0;
  expertCumulativeRewards.forEach((reward, index) => {
    if (bestExpertIndex === null || reward > bestExpertReward) {
      bestExpertIndex = index;
      bestExpertReward = reward;
    }
  });

  const empiricalRegret = bestExpertReward - algorithmExpectedReward;
  return {
    learningRounds: learningRounds.length,
    bestExpertIndex,
    expertCumulativeRewards,
    bestExpertReward,
    algorithmExpectedReward,
    empiricalRegret,
    perRoundRegret:
      learningRounds.length === 0
        ? 0
        : empiricalRegret / learningRounds.length,
  };
}
