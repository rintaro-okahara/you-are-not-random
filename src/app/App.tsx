import { useEffect, useMemo, useReducer } from "react";
import { challengeProgress } from "../challenge/challenge";
import { ChallengeProgress } from "../components/ChallengeProgress";
import { ChallengeResult } from "../components/ChallengeResult";
import { GamePanel } from "../components/GamePanel";
import { ScoreBoard } from "../components/ScoreBoard";
import { CurrentSuspicion } from "../components/CurrentSuspicion";
import { ExpertWeights } from "../components/ExpertWeights";
import { HistoryPanel } from "../components/HistoryPanel";
import { RegretPanel } from "../components/RegretPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { TransitionMatrix } from "../components/TransitionMatrix";
import { ViewTabs } from "../components/ViewTabs";
import { type RandomSource, secureRandom } from "../engine/sampling";
import { EXPERTS } from "../learning/experts";
import { summarizeRegret } from "../learning/regret";
import { aggregateStats } from "../stats/aggregateStats";
import { calculateTransitions } from "../stats/transitions";
import {
  clearSavedState,
  saveState,
} from "../storage/localStorage";
import "../styles/index.css";
import { appReducer } from "./appReducer";
import { createInitialState, toPersistedState } from "./initialState";

interface AppProps {
  readonly random?: RandomSource;
}

export function App({ random = secureRandom }: AppProps) {
  const [state, dispatch] = useReducer(
    appReducer,
    undefined,
    () => createInitialState({ random }),
  );
  const stats = useMemo(
    () => aggregateStats(state.learningStats),
    [state.learningStats],
  );
  const transitions = useMemo(
    () => calculateTransitions(state.learningStats),
    [state.learningStats],
  );
  const regret = useMemo(
    () => summarizeRegret(state.regretStats),
    [state.regretStats],
  );
  const bestExpertName =
    regret.bestExpertIndex === null
      ? "まだデータがありません"
      : (EXPERTS[regret.bestExpertIndex]?.name ?? "Unknown");
  const progress = challengeProgress(
    state.challenge,
    state.learningStats,
  );
  const challengeStats = {
    ...stats,
    totalRounds: progress.rounds,
    aiWins: progress.aiWins,
    humanWins: progress.humanWins,
    draws: progress.draws,
    aiWinRate:
      progress.rounds === 0 ? 0 : progress.aiWins / progress.rounds,
  };

  useEffect(() => {
    saveState(toPersistedState(state));
  }, [state]);

  const reset = () => {
    if (
      window.confirm(
        "履歴、expert重み、忘却率、学習設定、保存データをすべて初期化します。よろしいですか？",
      )
    ) {
      clearSavedState();
      dispatch({ type: "reset", random });
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#top"
          aria-label="勝利不能？じゃんけんAI トップ"
        >
          <span className="brand-mark" aria-hidden="true">
            YNR
          </span>
          <span>
            <strong>勝利不能？じゃんけんAI</strong>
            <small>50 ROUND ONLINE LEARNING</small>
          </span>
        </a>
        <div className="header-meta">
          <span>HEDGE / FIXED SHARE</span>
          <span>24 EXPERTS</span>
          <span className={state.learningEnabled ? "live" : "paused"}>
            {state.learningEnabled ? "● LIVE" : "○ PAUSED"}
          </span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <p className="hero-kicker">
              <span>ROCK / PAPER / SCISSORS</span>
              FULL-INFORMATION ONLINE LEARNING
            </p>
            <p className="hero-subtitle">YOU ARE NOT RANDOM</p>
            <h1 aria-label="勝利不能？ じゃんけんAI">
              勝利不能？
              <br />
              <em>じゃんけんAI</em>
            </h1>
          </div>
          <div className="hero-copy">
            <p className="hero-en">
              50回、AIにあなたの癖を見抜かれずにいられる？
            </p>
            <p>
              24種類の「あなたの癖の仮説」がリアルタイムで競い合います。
              AIの手は、あなたがクリックする前に決まっています。
            </p>
            <span className="hero-rule" aria-hidden="true" />
          </div>
        </section>

        <ViewTabs
          value={state.activeView}
          onChange={(view) => dispatch({ type: "set-view", view })}
        />

        {state.activeView === "play" ? (
          <section
            id="play-panel"
            className="view-panel"
            role="tabpanel"
            aria-labelledby="play-tab"
          >
            {state.challenge.status === "result" &&
            state.challenge.result !== null ? (
              <ChallengeResult
                result={state.challenge.result}
                celebrate={state.celebrateVictory}
                onContinue={() => dispatch({ type: "continue-challenge" })}
                onRetry={() => {
                  clearSavedState();
                  dispatch({ type: "retry-challenge", random });
                }}
                onOpenLab={() =>
                  dispatch({ type: "set-view", view: "lab" })
                }
              />
            ) : (
              <>
                <ChallengeProgress rounds={progress.rounds} />
                <div className="dashboard-grid play-grid">
                  <GamePanel
                    lastRound={state.recentHistory.at(-1)}
                    learningEnabled={state.learningEnabled}
                    onPlay={(humanHand) =>
                      dispatch({ type: "play", humanHand, random })
                    }
                  />
                  <ScoreBoard
                    stats={challengeStats}
                    title="50戦チャレンジ成績"
                    eyebrow="CHALLENGE SCORE"
                  />
                  <CurrentSuspicion
                    weights={state.expertWeights}
                    roundCount={progress.rounds}
                  />
                </div>
              </>
            )}
          </section>
        ) : (
          <section
            id="lab-panel"
            className="view-panel"
            role="tabpanel"
            aria-labelledby="lab-tab"
          >
            <div className="lab-intro">
              <div>
                <p className="eyebrow">RESEARCH VIEW</p>
                <h2>24の仮説が、リアルタイムで競い合う</h2>
                <p>
                  Hedgeでexpertを混合し、Fixed Shareで途中から変わる癖にも追従します。
                  表示する支持度は統計的な確率ではなく、現在のHedge weightです。
                </p>
              </div>
              {state.challenge.result !== null && (
                <button
                  className="diagnosis-return"
                  type="button"
                  onClick={() => dispatch({ type: "show-challenge-result" })}
                >
                  50戦の診断を見る
                </button>
              )}
            </div>
            <div className="dashboard-grid lab-grid">
              <RegretPanel summary={regret} bestExpertName={bestExpertName} />
              <TransitionMatrix rows={transitions} />
              <SettingsPanel
                learningEnabled={state.learningEnabled}
                alpha={state.alpha}
                onLearningChange={(enabled) =>
                  dispatch({ type: "set-learning", enabled, random })
                }
                onAlphaChange={(alpha) =>
                  dispatch({ type: "set-alpha", alpha })
                }
                onReset={reset}
              />
              <ExpertWeights
                weights={state.expertWeights}
                cumulativeRewards={regret.expertCumulativeRewards}
              />
              <HistoryPanel
                history={state.recentHistory}
                totalRounds={state.learningStats.totalRounds}
              />
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>勝利不能？じゃんけんAI / 2026</span>
        <p>
          予測可能性を主張するものではありません。ランダムな相手には利用可能な偏りはありません。
        </p>
        <a href="https://en.wikipedia.org/wiki/Regret_(decision_theory)">
          ABOUT REGRET ↗
        </a>
      </footer>
    </div>
  );
}
