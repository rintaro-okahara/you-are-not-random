import { HANDS } from "../domain/rps";
import type { TransitionRow } from "../stats/transitions";
import { formatPercent, handLabel } from "./format";

interface TransitionMatrixProps {
  readonly rows: readonly TransitionRow[];
}

export function TransitionMatrix({ rows }: TransitionMatrixProps) {
  const totalSamples = rows.reduce((sum, row) => sum + row.sampleCount, 0);
  return (
    <section className="card transition-card" aria-labelledby="transition-title">
      <div className="card-heading compact">
        <div>
          <p className="eyebrow">HUMAN TRANSITIONS / MARKOV-1</p>
          <h2 id="transition-title">人間の遷移確率</h2>
        </div>
        <span className="sample-count">N={totalSamples}</span>
      </div>
      <div className="table-wrap">
        <table className="transition-table">
          <caption className="sr-only">
            直前の手から次の手へのLaplace平滑化済み遷移確率
          </caption>
          <thead>
            <tr>
              <th scope="col">直前＼次</th>
              {HANDS.map((hand) => (
                <th scope="col" key={hand}>
                  {handLabel(hand)}
                </th>
              ))}
              <th scope="col">標本</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fromHand}>
                <th scope="row">{handLabel(row.fromHand)}の次</th>
                {row.probabilities.map((probability, index) => (
                  <td key={HANDS[index]}>
                    <span
                      className="heat-cell"
                      style={{ "--heat": probability } as React.CSSProperties}
                    >
                      {formatPercent(probability)}
                    </span>
                  </td>
                ))}
                <td>{row.sampleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalSamples < 10 && (
        <p className="footnote">
          まだデータが少ないため、各行はLaplace smoothingの影響を強く受けます。
        </p>
      )}
    </section>
  );
}
