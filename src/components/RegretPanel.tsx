import type { RegretSummary } from "../learning/regret";
import { formatNumber } from "./format";

interface RegretPanelProps {
  readonly summary: RegretSummary;
  readonly bestExpertName: string;
}

export function RegretPanel({
  summary,
  bestExpertName,
}: RegretPanelProps) {
  return (
    <section className="card regret-card" aria-labelledby="regret-title">
      <div className="card-heading compact">
        <div>
          <p className="eyebrow">COUNTERFACTUAL / EXPECTED</p>
          <h2 id="regret-title">Empirical regret</h2>
        </div>
        <span className="info-chip" title="実際の勝敗ではなく期待報酬で比較します">
          i
        </span>
      </div>
      <div className="regret-lead">
        <span>BEST FIXED EXPERT</span>
        <strong>{bestExpertName}</strong>
      </div>
      <dl className="regret-metrics">
        <div>
          <dt>BEST EXPERT</dt>
          <dd>{formatNumber(summary.bestExpertReward)}</dd>
        </div>
        <div>
          <dt>AI MIXTURE</dt>
          <dd>{formatNumber(summary.algorithmExpectedReward)}</dd>
        </div>
        <div className="regret-accent">
          <dt>REGRET</dt>
          <dd>{formatNumber(summary.empiricalRegret)}</dd>
        </div>
        <div>
          <dt>PER ROUND</dt>
          <dd>{formatNumber(summary.perRoundRegret)}</dd>
        </div>
      </dl>
      <p className="footnote">
        学習ONのラウンドで、事後的なbest fixed expertと混合戦略を比較。
        Fixed Shareのtracking regretではありません。
      </p>
    </section>
  );
}
