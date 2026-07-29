import { describe, expect, it } from "vitest";
import { EXPERTS } from "../learning/experts";
import { createLearningStats } from "../learning/learningStats";
import {
  CHALLENGE_ROUNDS,
  advanceChallenge,
  challengeProgress,
  continueChallenge,
  createChallengeState,
} from "./challenge";

const baselineStats = createLearningStats();
const weights = EXPERTS.map((_, index) =>
  index === 6 ? 0.4 : 0.6 / (EXPERTS.length - 1),
);

describe("50-round challenge", () => {
  it("stays active through round 49 and snapshots round 50 once", () => {
    const challenge = createChallengeState(baselineStats);
    const at49 = {
      ...baselineStats,
      totalRounds: 49,
      aiWins: 20,
      humanWins: 18,
      draws: 11,
    };
    expect(advanceChallenge(challenge, at49, weights, 1_000).result).toBeNull();

    const at50 = { ...at49, totalRounds: 50, aiWins: 21 };
    const completed = advanceChallenge(challenge, at50, weights, 2_000);
    expect(completed.status).toBe("result");
    expect(completed.result).toMatchObject({
      completedAt: 2_000,
      aiWins: 21,
      humanWins: 18,
      draws: 11,
      expertId: EXPERTS[6]?.id,
      support: 0.4,
    });

    const at51 = { ...at50, totalRounds: 51, humanWins: 19 };
    expect(
      advanceChallenge(
        completed,
        at51,
        weights.map(() => 1 / EXPERTS.length),
        3_000,
      ).result,
    ).toEqual(completed.result);
  });

  it("continues without losing the frozen result", () => {
    const completed = advanceChallenge(
      createChallengeState(baselineStats),
      {
        ...baselineStats,
        totalRounds: CHALLENGE_ROUNDS,
        draws: CHALLENGE_ROUNDS,
      },
      weights,
      2_000,
    );

    expect(continueChallenge(completed)).toMatchObject({
      status: "continued",
      result: completed.result,
    });
  });

  it("subtracts a migrated cumulative baseline from progress and scores", () => {
    const existing = {
      ...baselineStats,
      totalRounds: 65,
      aiWins: 24,
      humanWins: 21,
      draws: 20,
    };
    const challenge = createChallengeState(existing);
    const afterOne = { ...existing, totalRounds: 66, aiWins: 25 };

    expect(challengeProgress(challenge, afterOne)).toEqual({
      rounds: 1,
      aiWins: 1,
      humanWins: 0,
      draws: 0,
    });
  });
});
