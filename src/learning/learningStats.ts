import { handToIndex } from "../domain/rps";
import type { Hand, Reward, RoundRecord } from "../domain/types";

export type CountVector = readonly [number, number, number];
export type MarkovTable = Readonly<Record<string, CountVector>>;

export interface LastRoundSummary {
  readonly humanHand: Hand;
  readonly aiHand: Hand;
  readonly actualReward: Reward;
}

export interface LearningStats {
  readonly totalRounds: number;
  readonly globalCounts: CountVector;
  readonly recent5Counts: CountVector;
  readonly recent10Counts: CountVector;
  readonly recent20Counts: CountVector;
  readonly decayedCounts: CountVector;
  readonly markovCounts: readonly [
    MarkovTable,
    MarkovTable,
    MarkovTable,
  ];
  readonly recentHands: readonly Hand[];
  readonly recentRewards: readonly Reward[];
  readonly lastRound: LastRoundSummary | null;
  readonly handStreakLength: number;
  readonly aiWins: number;
  readonly humanWins: number;
  readonly draws: number;
  readonly resultStreakReward: Reward;
  readonly resultStreakCount: number;
}

const ZERO_COUNTS: CountVector = [0, 0, 0];
const DECAY = 0.85;
const MAX_HAND_WINDOW = 20;
const MAX_RESULT_WINDOW = 10;

export function createLearningStats(): LearningStats {
  return {
    totalRounds: 0,
    globalCounts: ZERO_COUNTS,
    recent5Counts: ZERO_COUNTS,
    recent10Counts: ZERO_COUNTS,
    recent20Counts: ZERO_COUNTS,
    decayedCounts: ZERO_COUNTS,
    markovCounts: [{}, {}, {}],
    recentHands: [],
    recentRewards: [],
    lastRound: null,
    handStreakLength: 0,
    aiWins: 0,
    humanWins: 0,
    draws: 0,
    resultStreakReward: 0,
    resultStreakCount: 0,
  };
}

function incrementCount(
  counts: CountVector,
  hand: Hand,
  amount = 1,
): CountVector {
  const next: [number, number, number] = [...counts];
  next[handToIndex(hand)] += amount;
  return next;
}

function updateRollingCounts(
  counts: CountVector,
  previousHands: readonly Hand[],
  window: number,
  nextHand: Hand,
): CountVector {
  let next = counts;
  if (previousHands.length >= window) {
    const leaving = previousHands[previousHands.length - window];
    if (leaving !== undefined) {
      next = incrementCount(next, leaving, -1);
    }
  }
  return incrementCount(next, nextHand);
}

export function markovContextKey(context: readonly Hand[]): string {
  return context.join("|");
}

export function getMarkovCounts(
  stats: LearningStats,
  context: readonly Hand[],
): CountVector {
  const table = stats.markovCounts[context.length - 1];
  return table?.[markovContextKey(context)] ?? ZERO_COUNTS;
}

function updateMarkovTables(
  stats: LearningStats,
  nextHand: Hand,
): LearningStats["markovCounts"] {
  const tables: [
    Record<string, CountVector>,
    Record<string, CountVector>,
    Record<string, CountVector>,
  ] = [
    { ...stats.markovCounts[0] },
    { ...stats.markovCounts[1] },
    { ...stats.markovCounts[2] },
  ];

  for (let order = 1; order <= 3; order += 1) {
    if (stats.recentHands.length < order) {
      continue;
    }
    const context = stats.recentHands.slice(-order);
    const key = markovContextKey(context);
    const table = tables[order - 1];
    if (table !== undefined) {
      table[key] = incrementCount(table[key] ?? ZERO_COUNTS, nextHand);
    }
  }
  return tables;
}

export function updateLearningStats(
  stats: LearningStats,
  round: RoundRecord,
): LearningStats {
  const sameHand = stats.lastRound?.humanHand === round.humanHand;
  const isWinOrLoss = round.actualReward !== 0;
  const continuesResultStreak =
    isWinOrLoss && stats.resultStreakReward === round.actualReward;

  return {
    totalRounds: stats.totalRounds + 1,
    globalCounts: incrementCount(stats.globalCounts, round.humanHand),
    recent5Counts: updateRollingCounts(
      stats.recent5Counts,
      stats.recentHands,
      5,
      round.humanHand,
    ),
    recent10Counts: updateRollingCounts(
      stats.recent10Counts,
      stats.recentHands,
      10,
      round.humanHand,
    ),
    recent20Counts: updateRollingCounts(
      stats.recent20Counts,
      stats.recentHands,
      20,
      round.humanHand,
    ),
    decayedCounts: incrementCount(
      [
        stats.decayedCounts[0] * DECAY,
        stats.decayedCounts[1] * DECAY,
        stats.decayedCounts[2] * DECAY,
      ],
      round.humanHand,
    ),
    markovCounts: updateMarkovTables(stats, round.humanHand),
    recentHands: [...stats.recentHands, round.humanHand].slice(
      -MAX_HAND_WINDOW,
    ),
    recentRewards: [...stats.recentRewards, round.actualReward].slice(
      -MAX_RESULT_WINDOW,
    ),
    lastRound: {
      humanHand: round.humanHand,
      aiHand: round.aiHand,
      actualReward: round.actualReward,
    },
    handStreakLength: sameHand ? stats.handStreakLength + 1 : 1,
    aiWins: stats.aiWins + (round.actualReward === 1 ? 1 : 0),
    humanWins: stats.humanWins + (round.actualReward === -1 ? 1 : 0),
    draws: stats.draws + (round.actualReward === 0 ? 1 : 0),
    resultStreakReward: isWinOrLoss ? round.actualReward : 0,
    resultStreakCount: isWinOrLoss
      ? continuesResultStreak
        ? stats.resultStreakCount + 1
        : 1
      : 0,
  };
}

export function buildLearningStats(
  history: readonly RoundRecord[],
): LearningStats {
  return history.reduce(updateLearningStats, createLearningStats());
}
