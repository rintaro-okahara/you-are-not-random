import {
  CHALLENGE_ROUNDS,
  challengeStage,
} from "../challenge/challenge";

interface ChallengeProgressProps {
  readonly rounds: number;
}

const STAGE_LABELS = {
  analyzing: "分析中",
  provisional: "暫定仮説",
  complete: "診断完了",
} as const;

export function ChallengeProgress({ rounds }: ChallengeProgressProps) {
  const completed = Math.min(
    CHALLENGE_ROUNDS,
    Math.max(0, Math.trunc(rounds)),
  );
  const stage = STAGE_LABELS[challengeStage(completed)];

  return (
    <section
      className="card challenge-progress"
      aria-labelledby="challenge-title"
    >
      <div>
        <p className="eyebrow">50 ROUND CHALLENGE</p>
        <h2 id="challenge-title">
          50回、AIに癖を見抜かれずにいられる？
        </h2>
        <p>
          AIの手はクリック前に決定済み。24の仮説があなたの選び方を追跡します。
        </p>
      </div>
      <div className="challenge-progress-meter">
        <div className="challenge-progress-value">
          <strong>{completed}</strong>
          <span>/ {CHALLENGE_ROUNDS}</span>
          <b>{stage}</b>
        </div>
        <progress max={CHALLENGE_ROUNDS} value={completed}>
          {completed} / {CHALLENGE_ROUNDS}
        </progress>
      </div>
    </section>
  );
}
