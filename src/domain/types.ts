export type Hand = "rock" | "paper" | "scissors";

export type ProbabilityVector = readonly [number, number, number];

export type Reward = -1 | 0 | 1;

export type RoundOutcome = "ai-win" | "human-win" | "draw";

export interface RoundRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly humanHand: Hand;
  readonly aiHand: Hand;
  readonly aiDistribution: ProbabilityVector;
  readonly expertWeightsBefore: readonly number[];
  readonly expertRewards: readonly number[];
  readonly aiExpectedReward: number;
  readonly actualReward: Reward;
  readonly learningEnabled: boolean;
}

export interface Expert {
  readonly id: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly suspicionText: string;
  predictHuman(history: readonly RoundRecord[]): ProbabilityVector;
}
