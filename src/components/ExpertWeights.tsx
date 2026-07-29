import { EXPERTS } from "../learning/experts";
import { formatNumber, formatPercent } from "./format";

interface ExpertWeightsProps {
  readonly weights: readonly number[];
  readonly cumulativeRewards: readonly number[];
}

export function ExpertWeights({
  weights,
  cumulativeRewards,
}: ExpertWeightsProps) {
  const ranked = EXPERTS.map((expert, index) => ({
    expert,
    weight: weights[index] ?? 0,
    reward: cumulativeRewards[index] ?? 0,
  })).sort((left, right) => right.weight - left.weight);
  const maximum = ranked[0]?.weight ?? 1;

  return (
    <section className="card experts-card" aria-labelledby="experts-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">EXPERT ENSEMBLE / 24 SIGNALS</p>
          <h2 id="experts-title">expert重み</h2>
        </div>
        <p className="heading-note">Fixed Share後の現在値</p>
      </div>
      <div className="expert-table-header" aria-hidden="true">
        <span>RANK / EXPERT</span>
        <span>累積期待報酬</span>
        <span>WEIGHT</span>
      </div>
      <ol className="expert-list">
        {ranked.map(({ expert, weight, reward }, index) => (
          <li key={expert.id} className={index < 3 ? "expert-leading" : ""}>
            <span className="expert-rank">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="expert-copy">
              <strong>{expert.name}</strong>
              <small>{expert.shortDescription}</small>
              <span className="bar-track">
                <span
                  className="bar-fill"
                  style={{
                    width: `${maximum === 0 ? 0 : (weight / maximum) * 100}%`,
                  }}
                />
              </span>
            </span>
            <span className="expert-reward">{formatNumber(reward)}</span>
            <b className="expert-weight">{formatPercent(weight)}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}
