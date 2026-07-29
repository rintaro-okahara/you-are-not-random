import type { LearningStats } from "../learning/learningStats";

export interface AggregateStats {
  readonly totalRounds: number;
  readonly aiWins: number;
  readonly humanWins: number;
  readonly draws: number;
  readonly aiWinRate: number;
  readonly recentAiWinRate: number;
  readonly streakKind: "ai-win" | "human-win" | "none";
  readonly streakCount: number;
}

export function aggregateStats(
  stats: LearningStats,
): AggregateStats {
  const recentAiWins = stats.recentRewards.filter(
    (reward) => reward === 1,
  ).length;

  return {
    totalRounds: stats.totalRounds,
    aiWins: stats.aiWins,
    humanWins: stats.humanWins,
    draws: stats.draws,
    aiWinRate:
      stats.totalRounds === 0 ? 0 : stats.aiWins / stats.totalRounds,
    recentAiWinRate:
      stats.recentRewards.length === 0
        ? 0
        : recentAiWins / stats.recentRewards.length,
    streakKind:
      stats.resultStreakReward === 1
        ? "ai-win"
        : stats.resultStreakReward === -1
          ? "human-win"
          : "none",
    streakCount: stats.resultStreakCount,
  };
}
