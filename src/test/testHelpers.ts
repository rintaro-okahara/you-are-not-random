import type {
  Hand,
  ProbabilityVector,
  Reward,
  RoundRecord,
} from "../domain/types";

const UNIFORM: ProbabilityVector = [1 / 3, 1 / 3, 1 / 3];

export function makeRound(
  humanHand: Hand,
  options: {
    aiHand?: Hand;
    actualReward?: Reward;
    id?: string;
    expertRewards?: readonly number[];
    expertWeightsBefore?: readonly number[];
    learningEnabled?: boolean;
  } = {},
): RoundRecord {
  return {
    id: options.id ?? crypto.randomUUID(),
    timestamp: 1_700_000_000_000,
    humanHand,
    aiHand: options.aiHand ?? "rock",
    aiDistribution: UNIFORM,
    expertWeightsBefore: options.expertWeightsBefore ?? [1],
    expertRewards: options.expertRewards ?? [0],
    aiExpectedReward: 0,
    actualReward: options.actualReward ?? 0,
    learningEnabled: options.learningEnabled ?? true,
  };
}

export function historyFromHands(
  ...hands: readonly Hand[]
): readonly RoundRecord[] {
  return hands.map((hand, index) => makeRound(hand, { id: `round-${index}` }));
}
