import type {
  Hand,
  ProbabilityVector,
  Reward,
  RoundOutcome,
} from "./types";

export const HANDS = ["rock", "paper", "scissors"] as const;

export const PAYOFF_MATRIX = [
  [0, -1, 1],
  [1, 0, -1],
  [-1, 1, 0],
] as const;

export const HAND_LABELS: Readonly<Record<Hand, string>> = {
  rock: "グー",
  paper: "パー",
  scissors: "チョキ",
};

export const HAND_EMOJI: Readonly<Record<Hand, string>> = {
  rock: "✊",
  paper: "✋",
  scissors: "✌️",
};

const HAND_INDEX: Readonly<Record<Hand, 0 | 1 | 2>> = {
  rock: 0,
  paper: 1,
  scissors: 2,
};

export function handToIndex(hand: Hand): 0 | 1 | 2 {
  return HAND_INDEX[hand];
}

export function isHand(value: unknown): value is Hand {
  return typeof value === "string" && HANDS.includes(value as Hand);
}

export function getPayoff(aiHand: Hand, humanHand: Hand): Reward {
  return PAYOFF_MATRIX[handToIndex(aiHand)][handToIndex(humanHand)];
}

export function getOutcome(aiHand: Hand, humanHand: Hand): RoundOutcome {
  const payoff = getPayoff(aiHand, humanHand);
  return payoff === 1 ? "ai-win" : payoff === -1 ? "human-win" : "draw";
}

export function counterHand(hand: Hand): Hand {
  return HANDS[((handToIndex(hand) + 1) % HANDS.length) as 0 | 1 | 2];
}

export function cycleForward(hand: Hand): Hand {
  return counterHand(hand);
}

export function cycleBackward(hand: Hand): Hand {
  return HANDS[((handToIndex(hand) + 2) % HANDS.length) as 0 | 1 | 2];
}

export function rewardVectorForHuman(
  humanHand: Hand,
): ProbabilityVector {
  const humanIndex = handToIndex(humanHand);
  return [
    PAYOFF_MATRIX[0][humanIndex],
    PAYOFF_MATRIX[1][humanIndex],
    PAYOFF_MATRIX[2][humanIndex],
  ];
}
