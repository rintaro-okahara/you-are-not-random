import { useEffect, useMemo, useReducer } from "react";
import { GamePanel } from "../components/GamePanel";
import { ScoreBoard } from "../components/ScoreBoard";
import { CurrentSuspicion } from "../components/CurrentSuspicion";
import { ExpertWeights } from "../components/ExpertWeights";
import { HistoryPanel } from "../components/HistoryPanel";
import { RegretPanel } from "../components/RegretPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { TransitionMatrix } from "../components/TransitionMatrix";
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
        <a className="brand" href="#top" aria-label="You Are Not Random トップ">
          <span className="brand-mark" aria-hidden="true">
            YNR
          </span>
          <span>
            <strong>YOU ARE NOT RANDOM</strong>
            <small>ONLINE LEARNING LAB</small>
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
              <span>EXPERIMENT 001</span>
              FULL-INFORMATION ONLINE LEARNING
            </p>
            <h1>
              YOU ARE
              <br />
              <em>NOT RANDOM.</em>
            </h1>
          </div>
          <div className="hero-copy">
            <p className="hero-en">
              Hedge learns the patterns in your rock-paper-scissors play.
            </p>
            <p>
              24の仮説が、あなたの次の手を同時に予測します。
              Fixed Shareは、途中で変わる癖にも追いつこうとします。
            </p>
            <span className="hero-rule" aria-hidden="true" />
          </div>
        </section>

        <div className="dashboard-grid">
          <GamePanel
            lastRound={state.recentHistory.at(-1)}
            learningEnabled={state.learningEnabled}
            onPlay={(humanHand) =>
              dispatch({ type: "play", humanHand, random })
            }
          />
          <ScoreBoard stats={stats} />
          <CurrentSuspicion
            weights={state.expertWeights}
            roundCount={state.learningStats.totalRounds}
          />
          <RegretPanel summary={regret} bestExpertName={bestExpertName} />
          <TransitionMatrix rows={transitions} />
          <SettingsPanel
            learningEnabled={state.learningEnabled}
            alpha={state.alpha}
            onLearningChange={(enabled) =>
              dispatch({ type: "set-learning", enabled, random })
            }
            onAlphaChange={(alpha) => dispatch({ type: "set-alpha", alpha })}
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
      </main>

      <footer>
        <span>YNR / 2026</span>
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
