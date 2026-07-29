import {
  counterHand,
  cycleBackward,
  cycleForward,
} from "../domain/rps";
import { UNIFORM_PROBABILITY } from "../domain/probability";
import type { ProbabilityVector } from "../domain/types";
import {
  buildExpert,
  decayedFrequency,
  laplaceFrequency,
  lastRound,
  markovPrediction,
  periodPrediction,
  predictionAvoiding,
  repeatedTailLength,
  smoothedHandPrediction,
} from "./expertHelpers";
import type {
  LastRoundSummary,
  LearningStats,
} from "./learningStats";
import type { Expert } from "./types";

const fallback = (stats: LearningStats) => laplaceFrequency(stats);

function whenLastRound(
  history: LearningStats,
  condition: (round: LastRoundSummary) => boolean,
  prediction: (round: LastRoundSummary) => ProbabilityVector,
): ProbabilityVector {
  const previous = lastRound(history);
  return previous !== undefined && condition(previous)
    ? prediction(previous)
    : fallback(history);
}

export const EXPERTS: readonly Expert[] = [
  buildExpert(
    "uniform",
    "Uniform",
    "基準となる一様予測",
    "どの手にも明確な偏りがない可能性を疑っています",
    () => UNIFORM_PROBABILITY,
  ),
  buildExpert(
    "global-frequency",
    "Global Frequency",
    "全対戦の手の頻度",
    "これまで全体で多く出した手をまた出す傾向を疑っています",
    fallback,
  ),
  buildExpert(
    "recent-frequency-5",
    "Recent Frequency 5",
    "直近5戦の手の頻度",
    "直近5戦で多い手が続く傾向を疑っています",
    (history) => laplaceFrequency(history, 5),
  ),
  buildExpert(
    "recent-frequency-10",
    "Recent Frequency 10",
    "直近10戦の手の頻度",
    "直近10戦で多い手が続く傾向を疑っています",
    (history) => laplaceFrequency(history, 10),
  ),
  buildExpert(
    "recent-frequency-20",
    "Recent Frequency 20",
    "直近20戦の手の頻度",
    "直近20戦で多い手が続く傾向を疑っています",
    (history) => laplaceFrequency(history, 20),
  ),
  buildExpert(
    "decayed-frequency",
    "Exponentially Decayed Frequency",
    "新しい観測を重視する頻度",
    "最近よく出した手を重ねる傾向を疑っています",
    (history) => decayedFrequency(history),
  ),
  buildExpert(
    "repeat-last",
    "Repeat Last",
    "直前の手を繰り返す予測",
    "直前と同じ手をもう一度出す傾向を疑っています",
    (history) => {
      const previous = lastRound(history);
      return previous === undefined
        ? fallback(history)
        : smoothedHandPrediction(previous.humanHand);
    },
  ),
  buildExpert(
    "cycle-forward",
    "Cycle Forward",
    "グー→パー→チョキの循環",
    "手をグー、パー、チョキの順に進める傾向を疑っています",
    (history) => {
      const previous = lastRound(history);
      return previous === undefined
        ? fallback(history)
        : smoothedHandPrediction(cycleForward(previous.humanHand));
    },
  ),
  buildExpert(
    "cycle-backward",
    "Cycle Backward",
    "グー→チョキ→パーの循環",
    "手を逆向きの順序で戻す傾向を疑っています",
    (history) => {
      const previous = lastRound(history);
      return previous === undefined
        ? fallback(history)
        : smoothedHandPrediction(cycleBackward(previous.humanHand));
    },
  ),
  buildExpert(
    "avoid-repeat",
    "Avoid Repeat",
    "直前とは違う2手を予測",
    "同じ手を続けず別の手へ変える傾向を疑っています",
    (history) => {
      const previous = lastRound(history);
      return previous === undefined
        ? fallback(history)
        : predictionAvoiding(previous.humanHand);
    },
  ),
  buildExpert(
    "break-streak-2",
    "Break Two-Hand Streak",
    "同じ手が2回続くと変える予測",
    "2連続した手を次で変える傾向を疑っています",
    (history) => {
      const previous = lastRound(history);
      return previous !== undefined && repeatedTailLength(history) >= 2
        ? predictionAvoiding(previous.humanHand)
        : fallback(history);
    },
  ),
  buildExpert(
    "break-streak-3",
    "Break Three-Hand Streak",
    "同じ手が3回続くと変える予測",
    "3連続した手を次で変える傾向を疑っています",
    (history) => {
      const previous = lastRound(history);
      return previous !== undefined && repeatedTailLength(history) >= 3
        ? predictionAvoiding(previous.humanHand)
        : fallback(history);
    },
  ),
  buildExpert(
    "human-win-stay",
    "Human Win-Stay",
    "勝った後は同じ手を予測",
    "直前に勝った手をもう一度出す傾向を疑っています",
    (history) =>
      whenLastRound(
        history,
        (round) => round.actualReward === -1,
        (round) => smoothedHandPrediction(round.humanHand),
      ),
  ),
  buildExpert(
    "human-lose-shift-forward",
    "Human Lose-Shift Forward",
    "負けた後は手を順方向へ変更",
    "負けた後に手を1つ進める傾向を疑っています",
    (history) =>
      whenLastRound(
        history,
        (round) => round.actualReward === 1,
        (round) => smoothedHandPrediction(cycleForward(round.humanHand)),
      ),
  ),
  buildExpert(
    "human-lose-shift-backward",
    "Human Lose-Shift Backward",
    "負けた後は手を逆方向へ変更",
    "負けた後に手を1つ戻す傾向を疑っています",
    (history) =>
      whenLastRound(
        history,
        (round) => round.actualReward === 1,
        (round) => smoothedHandPrediction(cycleBackward(round.humanHand)),
      ),
  ),
  buildExpert(
    "human-draw-repeat",
    "Human Draw-Repeat",
    "引き分け後は同じ手を予測",
    "引き分けた手をもう一度出す傾向を疑っています",
    (history) =>
      whenLastRound(
        history,
        (round) => round.actualReward === 0,
        (round) => smoothedHandPrediction(round.humanHand),
      ),
  ),
  buildExpert(
    "counter-last-ai",
    "Counter Last AI Hand",
    "直前のAIに勝つ手を予測",
    "AIが直前に出した手へ勝つ手を選ぶ傾向を疑っています",
    (history) =>
      whenLastRound(
        history,
        () => true,
        (round) => smoothedHandPrediction(counterHand(round.aiHand)),
      ),
  ),
  buildExpert(
    "copy-last-ai",
    "Copy Last AI Hand",
    "直前のAIの手を真似る予測",
    "AIが直前に出した手をコピーする傾向を疑っています",
    (history) =>
      whenLastRound(
        history,
        () => true,
        (round) => smoothedHandPrediction(round.aiHand),
      ),
  ),
  buildExpert(
    "markov-1",
    "First-Order Markov",
    "直前1手を条件にした遷移",
    "直前の手ごとに次の手を変える傾向を疑っています",
    (history) => markovPrediction(history, 1),
  ),
  buildExpert(
    "markov-2",
    "Second-Order Markov",
    "直前2手を条件にした遷移",
    "直前2手の並びに応じて次を選ぶ傾向を疑っています",
    (history) => markovPrediction(history, 2),
  ),
  buildExpert(
    "markov-3",
    "Third-Order Markov",
    "直前3手を条件にした遷移",
    "直前3手の並びに応じて次を選ぶ傾向を疑っています",
    (history) => markovPrediction(history, 3),
  ),
  buildExpert(
    "period-2",
    "Period 2",
    "2ラウンド前の手を予測",
    "2手周期のパターンを繰り返す傾向を疑っています",
    (history) => periodPrediction(history, 2),
  ),
  buildExpert(
    "period-3",
    "Period 3",
    "3ラウンド前の手を予測",
    "3手周期のパターンを繰り返す傾向を疑っています",
    (history) => periodPrediction(history, 3),
  ),
  buildExpert(
    "period-4",
    "Period 4",
    "4ラウンド前の手を予測",
    "4手周期のパターンを繰り返す傾向を疑っています",
    (history) => periodPrediction(history, 4),
  ),
] as const;

export function getExpertById(id: string): Expert {
  const expert = EXPERTS.find((candidate) => candidate.id === id);
  if (expert === undefined) {
    throw new Error(`Unknown expert: ${id}`);
  }
  return expert;
}
