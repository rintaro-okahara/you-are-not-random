import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";

const CONFETTI_COUNT = 28;
const CONFETTI_DURATION_MS = 2_200;
const COUNT_DURATION_MS = 800;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function AnimatedNumber({
  value,
  active,
}: {
  readonly value: number;
  readonly active: boolean;
}) {
  const [display, setDisplay] = useState(active ? 0 : value);

  useEffect(() => {
    if (!active) {
      return;
    }

    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const progress = Math.min(
        1,
        (performance.now() - startedAt) / COUNT_DURATION_MS,
      );
      setDisplay(Math.round(value * progress));
      if (progress >= 1) {
        window.clearInterval(interval);
      }
    }, 40);

    return () => window.clearInterval(interval);
  }, [active, value]);

  return <>{display}</>;
}

interface VictoryCelebrationProps {
  readonly active: boolean;
  readonly humanWins: number;
  readonly aiWins: number;
  readonly draws: number;
}

export function VictoryCelebration({
  active,
  humanWins,
  aiWins,
  draws,
}: VictoryCelebrationProps) {
  const motionAllowed = !prefersReducedMotion();
  const animate = active && motionAllowed;
  const [showConfetti, setShowConfetti] = useState(animate);

  useEffect(() => {
    if (!animate) {
      return;
    }
    const timeout = window.setTimeout(
      () => setShowConfetti(false),
      CONFETTI_DURATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [animate]);

  return (
    <div
      className={`victory-celebration${animate ? " is-active" : ""}`}
      aria-label="50戦の勝利スコア"
    >
      <div className="victory-effects" aria-hidden="true">
        <span className="victory-burst" />
        {showConfetti && (
          <span
            className="victory-confetti"
            data-testid="victory-confetti"
          >
            {Array.from({ length: CONFETTI_COUNT }, (_, index) => {
              const style = {
                "--confetti-x": `${(index * 37 + 9) % 100}%`,
                "--confetti-delay": `${(index % 7) * 55}ms`,
                "--confetti-rotation": `${(index * 47) % 180}deg`,
                "--confetti-color":
                  index % 3 === 0
                    ? "#ffcc66"
                    : index % 3 === 1
                      ? "#5eead4"
                      : "#fff1bc",
              } as CSSProperties;
              return (
                <i
                  className="victory-confetti-piece"
                  style={style}
                  key={index}
                />
              );
            })}
          </span>
        )}
      </div>
      <span className="victory-stamp" aria-hidden="true">
        VICTORY
      </span>

      <div className="victory-score" aria-hidden="true">
        <div>
          <span>YOU</span>
          <strong>
            <AnimatedNumber value={humanWins} active={animate} />
          </strong>
        </div>
        <div>
          <span>AI</span>
          <strong>
            <AnimatedNumber value={aiWins} active={animate} />
          </strong>
        </div>
        <div>
          <span>DRAW</span>
          <strong>
            <AnimatedNumber value={draws} active={animate} />
          </strong>
        </div>
      </div>
      <p className="sr-only">
        50戦の成績：あなた {humanWins}勝、AI {aiWins}勝、引き分け
        {draws}回
      </p>
    </div>
  );
}
