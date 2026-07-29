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

export interface RegretStats {
  readonly learningRounds: number;
  readonly expertCumulativeRewards: readonly number[];
  readonly algorithmExpectedReward: number;
}

export function createRegretStats(expertCount: number): RegretStats {
  return {
    learningRounds: 0,
    expertCumulativeRewards: Array.from(
      { length: Math.max(0, expertCount) },
      () => 0,
    ),
    algorithmExpectedReward: 0,
  };
}

export function updateRegretStats(
  stats: RegretStats,
  round: RoundRecord,
): RegretStats {
  if (!round.learningEnabled || round.expertRewards.length === 0) {
    return stats;
  }

  const expertCount = Math.max(
    stats.expertCumulativeRewards.length,
    round.expertRewards.length,
  );
  const cumulative = Array.from(
    { length: expertCount },
    (_, index) => stats.expertCumulativeRewards[index] ?? 0,
  );
  let algorithmExpectedReward = stats.algorithmExpectedReward;

  round.expertRewards.forEach((reward, index) => {
    cumulative[index] = (cumulative[index] ?? 0) + reward;
    algorithmExpectedReward +=
      (round.expertWeightsBefore[index] ?? 0) * reward;
  });

  return {
    learningRounds: stats.learningRounds + 1,
    expertCumulativeRewards: cumulative,
    algorithmExpectedReward,
  };
}

export function summarizeRegret(stats: RegretStats): RegretSummary {
  const expertCumulativeRewards = stats.expertCumulativeRewards;

  let bestExpertIndex: number | null = null;
  let bestExpertReward = 0;
  expertCumulativeRewards.forEach((reward, index) => {
    if (bestExpertIndex === null || reward > bestExpertReward) {
      bestExpertIndex = index;
      bestExpertReward = reward;
    }
  });

  const empiricalRegret =
    bestExpertReward - stats.algorithmExpectedReward;
  return {
    learningRounds: stats.learningRounds,
    bestExpertIndex,
    expertCumulativeRewards,
    bestExpertReward,
    algorithmExpectedReward: stats.algorithmExpectedReward,
    empiricalRegret,
    perRoundRegret:
      stats.learningRounds === 0
        ? 0
        : empiricalRegret / stats.learningRounds,
  };
}

export function calculateRegret(
  history: readonly RoundRecord[],
): RegretSummary {
  const expertCount = history.reduce(
    (maximum, round) => Math.max(maximum, round.expertRewards.length),
    0,
  );
  const stats = history.reduce(
    updateRegretStats,
    createRegretStats(expertCount),
  );
  return summarizeRegret(stats);
}
