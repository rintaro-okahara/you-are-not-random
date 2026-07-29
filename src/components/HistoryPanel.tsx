import { HANDS } from "../domain/rps";
import type { RoundRecord } from "../domain/types";
import { EXPERTS } from "../learning/experts";
import { formatPercent, handLabel, resultLabel } from "./format";

interface HistoryPanelProps {
  readonly history: readonly RoundRecord[];
  readonly totalRounds: number;
}

function topExpertName(round: RoundRecord): string {
  let best = 0;
  round.expertWeightsBefore.forEach((weight, index) => {
    if (weight > (round.expertWeightsBefore[best] ?? -Infinity)) {
      best = index;
    }
  });
  return EXPERTS[best]?.name ?? "Uniform";
}

export function HistoryPanel({ history, totalRounds }: HistoryPanelProps) {
  const recent = history.slice(-15).map((round, offset) => ({
    round,
    number: totalRounds - Math.min(15, history.length) + offset + 1,
  })).reverse();

  return (
    <section className="card history-card" aria-labelledby="history-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">ROUND LOG / LAST 15</p>
          <h2 id="history-title">直近の履歴</h2>
        </div>
        <span className="heading-note">
          全{totalRounds}戦 / 最新2,000件を保存
        </span>
      </div>
      {recent.length === 0 ? (
        <div className="empty-state">
          <span aria-hidden="true">⌁</span>
          <p>まだ対戦履歴がありません</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">ROUND</th>
                <th scope="col">あなた</th>
                <th scope="col">AI</th>
                <th scope="col">結果</th>
                <th scope="col">AI確率 R / P / S</th>
                <th scope="col">TOP EXPERT</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(({ round, number }) => (
                <tr key={round.id}>
                  <th scope="row">ラウンド #{number}</th>
                  <td>{handLabel(round.humanHand)}</td>
                  <td>{handLabel(round.aiHand)}</td>
                  <td>
                    <span className={`result-tag result-${round.actualReward}`}>
                      {resultLabel(round.actualReward)}
                    </span>
                  </td>
                  <td className="mono">
                    {HANDS.map((_, index) =>
                      formatPercent(round.aiDistribution[index] ?? 0),
                    ).join(" / ")}
                  </td>
                  <td>{topExpertName(round)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
