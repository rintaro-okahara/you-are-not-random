import type { AggregateStats } from "../stats/aggregateStats";
import { formatPercent } from "./format";

interface ScoreBoardProps {
  readonly stats: AggregateStats;
}

export function ScoreBoard({ stats }: ScoreBoardProps) {
  const streak =
    stats.streakKind === "ai-win"
      ? `AI ${stats.streakCount}連勝`
      : stats.streakKind === "human-win"
        ? `AI ${stats.streakCount}連敗`
        : "—";

  return (
    <section className="card score-card" aria-labelledby="score-title">
      <div className="card-heading compact">
        <div>
          <p className="eyebrow">MATCH TELEMETRY</p>
          <h2 id="score-title">累積成績</h2>
        </div>
        <span className="round-count">{stats.totalRounds} ROUNDS</span>
      </div>
      <div className="score-hero">
        <div>
          <span>AI WIN RATE</span>
          <strong>{formatPercent(stats.aiWinRate)}</strong>
        </div>
        <div className="score-ring" aria-hidden="true">
          <span>{stats.aiWins}</span>
          <small>WINS</small>
        </div>
      </div>
      <dl className="metric-grid">
        <div>
          <dt>AI勝利</dt>
          <dd>{stats.aiWins}</dd>
        </div>
        <div>
          <dt>人間勝利</dt>
          <dd>{stats.humanWins}</dd>
        </div>
        <div>
          <dt>引き分け</dt>
          <dd>{stats.draws}</dd>
        </div>
        <div>
          <dt>直近10戦</dt>
          <dd>{formatPercent(stats.recentAiWinRate)}</dd>
        </div>
        <div className="metric-wide">
          <dt>現在のストリーク</dt>
          <dd>{streak}</dd>
        </div>
      </dl>
    </section>
  );
}
