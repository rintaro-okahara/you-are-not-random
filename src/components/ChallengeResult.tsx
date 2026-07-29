import { useEffect, useRef, useState } from "react";
import type { ChallengeResult as ChallengeResultData } from "../challenge/challenge";
import {
  copyResultText,
  downloadResult,
  shareResult,
} from "../sharing/resultCard";
import { formatPercent } from "./format";

interface ChallengeResultProps {
  readonly result: ChallengeResultData;
  readonly onContinue: () => void;
  readonly onRetry: () => void;
  readonly onOpenLab: () => void;
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "共有をキャンセルしました。";
  }
  return error instanceof Error
    ? error.message
    : "操作を完了できませんでした。";
}

export function ChallengeResult({
  result,
  onContinue,
  onRetry,
  onOpenLab,
}: ChallengeResultProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const run = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setBusy(true);
    setStatus("");
    try {
      await action();
      setStatus(successMessage);
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const currentUrl = window.location.href;

  return (
    <section
      className="card challenge-result"
      aria-labelledby="result-title"
    >
      <div className="result-heading">
        <p className="eyebrow">ANALYSIS COMPLETE / 50 ROUNDS</p>
        <h2 id="result-title" ref={titleRef} tabIndex={-1}>
          分析完了
        </h2>
        <p>あなたの50戦から、AIが最も強く支持した仮説です。</p>
      </div>

      <div className="result-diagnosis">
        <span>AIが最も強く疑った仮説</span>
        <blockquote>「{result.suspicionText}」</blockquote>
        <div>
          <strong>{result.expertName}</strong>
          <span>
            現在の支持度 {formatPercent(result.support)}
            <small>Hedge weight</small>
          </span>
        </div>
      </div>

      <div className="result-score" aria-label="50戦の成績">
        <div>
          <span>YOU</span>
          <strong>あなた {result.humanWins}勝</strong>
        </div>
        <div>
          <span>AI</span>
          <strong>AI {result.aiWins}勝</strong>
        </div>
        <div>
          <span>DRAW</span>
          <strong>{result.draws}分</strong>
        </div>
      </div>

      <div className="result-actions">
        <button
          className="primary-action"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(
              () => shareResult(result, currentUrl),
              "共有メニューを開きました。",
            )
          }
        >
          結果をシェア
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(() => downloadResult(result), "画像を保存しました。")
          }
        >
          画像を保存
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(
              () => copyResultText(result, currentUrl),
              "投稿文をコピーしました。",
            )
          }
        >
          投稿文をコピー
        </button>
      </div>

      <p className="share-status" role="status" aria-live="polite">
        {status}
      </p>

      <div className="result-next-actions">
        <button className="continue-action" type="button" onClick={onContinue}>
          じゃんけんを続ける
        </button>
        <button type="button" onClick={onOpenLab}>
          LABで詳しい分析を見る
        </button>
        <button
          className="retry-action"
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "50戦の結果と学習状態を消して、もう一度挑戦しますか？",
              )
            ) {
              onRetry();
            }
          }}
        >
          もう一度挑戦する
        </button>
      </div>
    </section>
  );
}
