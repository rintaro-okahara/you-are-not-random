import { EXPERTS } from "../learning/experts";
import { formatPercent } from "./format";

interface CurrentSuspicionProps {
  readonly weights: readonly number[];
  readonly roundCount: number;
}

export function CurrentSuspicion({
  weights,
  roundCount,
}: CurrentSuspicionProps) {
  const ranked = EXPERTS.map((expert, index) => ({
    expert,
    weight: weights[index] ?? 0,
  })).sort((left, right) => right.weight - left.weight);
  const top = ranked[0];
  const uniformWeight = 1 / EXPERTS.length;
  const uncertain =
    roundCount < 3 || (top?.weight ?? 0) < uniformWeight * 1.2;

  return (
    <section className="card suspicion-card" aria-labelledby="suspicion-title">
      <div className="card-heading compact">
        <div>
          <p className="eyebrow">LIVE HYPOTHESIS</p>
          <h2 id="suspicion-title">AIが疑っている癖</h2>
        </div>
        <span className="scan-mark" aria-hidden="true">
          ◉
        </span>
      </div>
      <div className="suspicion-main">
        <span>現在AIが最も疑っている癖</span>
        <blockquote>
          {uncertain
            ? "まだ明確な癖は見つかっていません"
            : `「${top?.expert.suspicionText ?? ""}」`}
        </blockquote>
        <div className="confidence-line">
          <span>信頼度</span>
          <strong>{formatPercent(top?.weight ?? uniformWeight)}</strong>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${(top?.weight ?? 0) * 100}%` }}
            />
          </span>
        </div>
      </div>
      <ol className="top-experts">
        {ranked.slice(0, 3).map(({ expert, weight }, index) => (
          <li key={expert.id}>
            <span className="rank">0{index + 1}</span>
            <span>
              <strong>{expert.name}</strong>
              <small>{expert.shortDescription}</small>
            </span>
            <b>{formatPercent(weight)}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}
