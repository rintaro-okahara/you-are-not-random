import { EXPERTS } from "../learning/experts";
import type { LearningStats } from "../learning/learningStats";

export const CHALLENGE_ROUNDS = 50;

export type ChallengeStatus = "active" | "result" | "continued";
export type ChallengeStage = "analyzing" | "provisional" | "complete";
export type ChallengeOutcome = "human-victory" | "ai-victory" | "draw";

export interface ChallengeBaseline {
  readonly totalRounds: number;
  readonly aiWins: number;
  readonly humanWins: number;
  readonly draws: number;
}

export interface ChallengeResult {
  readonly completedAt: number;
  readonly aiWins: number;
  readonly humanWins: number;
  readonly draws: number;
  readonly expertId: string;
  readonly expertName: string;
  readonly suspicionText: string;
  readonly support: number;
}

export interface ChallengeState {
  readonly status: ChallengeStatus;
  readonly baseline: ChallengeBaseline;
  readonly result: ChallengeResult | null;
}

export interface ChallengeProgress {
  readonly rounds: number;
  readonly aiWins: number;
  readonly humanWins: number;
  readonly draws: number;
}

type ResultScore = Pick<ChallengeResult, "humanWins" | "aiWins">;

export function resultOutcome(result: ResultScore): ChallengeOutcome {
  if (result.humanWins > result.aiWins) {
    return "human-victory";
  }
  return result.humanWins < result.aiWins ? "ai-victory" : "draw";
}

export function createChallengeState(stats: LearningStats): ChallengeState {
  return {
    status: "active",
    baseline: {
      totalRounds: stats.totalRounds,
      aiWins: stats.aiWins,
      humanWins: stats.humanWins,
      draws: stats.draws,
    },
    result: null,
  };
}

export function challengeProgress(
  challenge: ChallengeState,
  stats: LearningStats,
): ChallengeProgress {
  return {
    rounds: Math.max(
      0,
      stats.totalRounds - challenge.baseline.totalRounds,
    ),
    aiWins: Math.max(0, stats.aiWins - challenge.baseline.aiWins),
    humanWins: Math.max(
      0,
      stats.humanWins - challenge.baseline.humanWins,
    ),
    draws: Math.max(0, stats.draws - challenge.baseline.draws),
  };
}

export function challengeStage(rounds: number): ChallengeStage {
  if (rounds < 8) {
    return "analyzing";
  }
  return rounds < CHALLENGE_ROUNDS ? "provisional" : "complete";
}

export function advanceChallenge(
  challenge: ChallengeState,
  stats: LearningStats,
  weights: readonly number[],
  completedAt: number,
): ChallengeState {
  const progress = challengeProgress(challenge, stats);
  if (
    challenge.result !== null ||
    progress.rounds < CHALLENGE_ROUNDS
  ) {
    return challenge;
  }

  const topIndex = weights.reduce(
    (best, weight, index) =>
      weight > (weights[best] ?? -Infinity) ? index : best,
    0,
  );
  const expert = EXPERTS[topIndex] ?? EXPERTS[0];
  if (expert === undefined) {
    return challenge;
  }

  return {
    ...challenge,
    status: "result",
    result: {
      completedAt,
      aiWins: progress.aiWins,
      humanWins: progress.humanWins,
      draws: progress.draws,
      expertId: expert.id,
      expertName: expert.name,
      suspicionText: expert.suspicionText,
      support: weights[topIndex] ?? 1 / EXPERTS.length,
    },
  };
}

export function continueChallenge(
  challenge: ChallengeState,
): ChallengeState {
  return challenge.result === null
    ? challenge
    : { ...challenge, status: "continued" };
}
