import type { RoundRecord } from "../domain/types";

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
  history: readonly RoundRecord[],
): AggregateStats {
  const aiWins = history.filter((round) => round.actualReward === 1).length;
  const humanWins = history.filter((round) => round.actualReward === -1).length;
  const draws = history.length - aiWins - humanWins;
  const recent = history.slice(-10);
  const recentAiWins = recent.filter(
    (round) => round.actualReward === 1,
  ).length;
  const latestReward = history.at(-1)?.actualReward;

  let streakCount = 0;
  if (latestReward === 1 || latestReward === -1) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (history[index]?.actualReward !== latestReward) {
        break;
      }
      streakCount += 1;
    }
  }

  return {
    totalRounds: history.length,
    aiWins,
    humanWins,
    draws,
    aiWinRate: history.length === 0 ? 0 : aiWins / history.length,
    recentAiWinRate: recent.length === 0 ? 0 : recentAiWins / recent.length,
    streakKind:
      latestReward === 1
        ? "ai-win"
        : latestReward === -1
          ? "human-win"
          : "none",
    streakCount,
  };
}
