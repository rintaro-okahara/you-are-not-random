import { HANDS, HAND_EMOJI } from "../domain/rps";
import type { Hand, RoundRecord } from "../domain/types";
import { EXPERTS } from "../learning/experts";
import { formatPercent, handLabel, resultLabel } from "./format";

interface GamePanelProps {
  readonly lastRound: RoundRecord | undefined;
  readonly learningEnabled: boolean;
  readonly onPlay: (hand: Hand) => void;
}

function highestWeightIndex(weights: readonly number[]): number {
  return weights.reduce(
    (best, weight, index) =>
      weight > (weights[best] ?? -Infinity) ? index : best,
    0,
  );
}

export function GamePanel({
  lastRound,
  learningEnabled,
  onPlay,
}: GamePanelProps) {
  const topExpert =
    lastRound === undefined
      ? undefined
      : EXPERTS[highestWeightIndex(lastRound.expertWeightsBefore)];

  return (
    <section className="card game-card" aria-labelledby="game-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">PLAYGROUND / ROUND {lastRound ? "ACTIVE" : "01"}</p>
          <h2 id="game-title">次の手を選ぶ</h2>
        </div>
        <span className={`status-pill ${learningEnabled ? "" : "status-off"}`}>
          <span aria-hidden="true" className="status-dot" />
          {learningEnabled ? "LEARNING ON" : "LEARNING OFF"}
        </span>
      </div>

      {!learningEnabled && (
        <p className="learning-off-notice" role="status">
          学習停止中：AIは一様ランダムです
        </p>
      )}

      <div className="hand-controls" aria-label="あなたの手">
        {HANDS.map((hand, index) => (
          <button
            className="hand-button"
            type="button"
            key={hand}
            aria-label={`${handLabel(hand)}を出す`}
            onClick={() => onPlay(hand)}
          >
            <span className="hand-key" aria-hidden="true">
              0{index + 1}
            </span>
            <span className="hand-emoji" aria-hidden="true">
              {HAND_EMOJI[hand]}
            </span>
            <span className="hand-name">{handLabel(hand)}</span>
            <span className="hand-en">{hand.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {lastRound === undefined ? (
        <div className="sealed-state">
          <span className="sealed-icon" aria-hidden="true">
            ◈
          </span>
          <div>
            <strong>手を選ぶまでAIの手と確率は非公開です</strong>
            <p>AIの手はすでに内部でサンプリングされています。</p>
          </div>
        </div>
      ) : (
        <div className="round-reveal" aria-live="polite">
          <div
            className={`result-banner result-${lastRound.actualReward}`}
            role="status"
            aria-label="直近ラウンドの結果"
          >
            <div>
              <p className="eyebrow">ROUND RESULT</p>
              <strong>{resultLabel(lastRound.actualReward)}</strong>
            </div>
            <div className="versus">
              <span>あなた：{handLabel(lastRound.humanHand)}</span>
              <b>VS</b>
              <span>AI：{handLabel(lastRound.aiHand)}</span>
            </div>
          </div>

          <div className="used-probability">
            <div className="subheading-row">
              <h3>このラウンドでAIが使った確率</h3>
              <span>公開済み</span>
            </div>
            <div className="probability-strip">
              {HANDS.map((hand, index) => (
                <div className="probability-item" key={hand}>
                  <div>
                    <span>{handLabel(hand)}</span>
                    <strong>
                      {formatPercent(lastRound.aiDistribution[index] ?? 0)}
                    </strong>
                  </div>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{
                        width: `${(lastRound.aiDistribution[index] ?? 0) * 100}%`,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
            <p className="round-expert">
              <span>TOP EXPERT AT DECISION</span>
              <strong>{topExpert?.name ?? "Uniform"}</strong>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
