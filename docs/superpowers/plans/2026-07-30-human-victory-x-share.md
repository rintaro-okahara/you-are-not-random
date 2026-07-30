# HUMAN VICTORY and X Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Celebrate a human 50-round win with a full-width animated result treatment and make the frozen result directly shareable through an X Web Intent.

**Architecture:** Derive a three-way outcome from the existing frozen `ChallengeResult`, then reuse it in the result component, share text, and canvas renderer. Keep the celebration trigger ephemeral in `App`, so a live round-50 transition animates but restored results do not. Use a normal X link, the existing Web Share API, and browser-local PNG generation without adding an SDK or backend.

**Tech Stack:** React 19, TypeScript 6, CSS animations, Canvas 2D, Vitest, Testing Library, Vite

---

## File Map

- `src/challenge/challenge.ts`: export the result outcome type and pure outcome classifier.
- `src/challenge/challenge.test.ts`: cover human victory, AI victory, and draw classification.
- `src/sharing/resultCard.ts`: generate per-destination text, X Intent URLs, and victory-aware PNGs.
- `src/sharing/resultCard.test.ts`: cover victory text, URL encoding, Web Share URL de-duplication, and canvas branch.
- `src/components/VictoryCelebration.tsx`: own decorative confetti lifetime and count-up number behavior.
- `src/components/VictoryCelebration.test.tsx`: cover active/inactive rendering and motion reduction.
- `src/components/ChallengeResult.tsx`: render outcome-specific content, X link, and reordered sharing actions.
- `src/components/ChallengeResult.test.tsx`: cover victory/normal states, link semantics, and existing actions.
- `src/app/App.tsx`: detect only a live `active -> result` transition and pass `celebrate`.
- `src/app/App.test.tsx`: distinguish live completion from restored/reopened results.
- `src/styles/index.css`: use the native Japanese font stack and style the full-width victory panel, motion, and responsive layout.

### Task 1: Classify the frozen 50-round result

**Files:**
- Modify: `src/challenge/challenge.ts`
- Test: `src/challenge/challenge.test.ts`

- [ ] **Step 1: Write the failing outcome tests**

Add the import and focused test:

```ts
import {
  // existing imports
  resultOutcome,
} from "./challenge";

it.each([
  [{ humanWins: 26, aiWins: 20 }, "human-victory"],
  [{ humanWins: 20, aiWins: 26 }, "ai-victory"],
  [{ humanWins: 22, aiWins: 22 }, "draw"],
] as const)("classifies %o as %s", (score, expected) => {
  expect(resultOutcome(score)).toBe(expected);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- src/challenge/challenge.test.ts
```

Expected: FAIL because `resultOutcome` is not exported.

- [ ] **Step 3: Implement the minimal pure classifier**

Add to `src/challenge/challenge.ts`:

```ts
export type ChallengeOutcome = "human-victory" | "ai-victory" | "draw";

type ResultScore = Pick<ChallengeResult, "humanWins" | "aiWins">;

export function resultOutcome(result: ResultScore): ChallengeOutcome {
  if (result.humanWins > result.aiWins) {
    return "human-victory";
  }
  return result.humanWins < result.aiWins ? "ai-victory" : "draw";
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- src/challenge/challenge.test.ts
```

Expected: one test file passes with all challenge tests green.

- [ ] **Step 5: Commit the domain change**

```bash
git add src/challenge/challenge.ts src/challenge/challenge.test.ts
git commit -m "feat: classify challenge outcomes"
```

### Task 2: Add victory-aware share copy and the X Intent URL

**Files:**
- Modify: `src/sharing/resultCard.ts`
- Test: `src/sharing/resultCard.test.ts`

- [ ] **Step 1: Write failing tests for victory copy and X URL**

Add a human-win fixture and assertions:

```ts
const humanVictory = {
  ...result,
  aiWins: 19,
  humanWins: 26,
  draws: 5,
};

it("celebrates a human victory in the public post text", () => {
  const text = createShareText(humanVictory, "https://example.test/");
  expect(text).toContain("勝利不能、ではなかった。");
  expect(text).toContain("50戦で勝ち越しました");
  expect(text).toContain("YOU 26勝 / AI 19勝 / DRAW 5回");
});

it("builds an encoded X Web Intent from the frozen result", () => {
  const intent = new URL(createXShareUrl(humanVictory, "https://example.test/"));
  expect(intent.origin + intent.pathname).toBe("https://x.com/intent/post");
  expect(intent.searchParams.get("text")).toBe(
    createShareText(humanVictory, "https://example.test/"),
  );
});
```

Update imports to include `createXShareUrl`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm test -- src/sharing/resultCard.test.ts
```

Expected: FAIL because victory copy and `createXShareUrl` are missing.

- [ ] **Step 3: Implement destination-aware text and X URL generation**

Refactor `createShareText` to branch on `resultOutcome(result)`:

```ts
function scoreLine(result: ChallengeResult): string {
  return `YOU ${result.humanWins}勝 / AI ${result.aiWins}勝 / DRAW ${result.draws}回`;
}

function shareLines(result: ChallengeResult): string[] {
  if (resultOutcome(result) === "human-victory") {
    return [
      "勝利不能、ではなかった。",
      "「勝利不能？じゃんけんAI」に50戦で勝ち越しました。",
      "",
      scoreLine(result),
    ];
  }
  return [
    "勝利不能？じゃんけんAIに50回挑戦。",
    `AIに「${suspicionLabel(result)}」を疑われました。`,
    "",
    scoreLine(result),
  ];
}

export function createShareText(result: ChallengeResult, url: string): string {
  return [
    ...shareLines(result),
    url,
    "#勝利不能じゃんけんAI",
  ].join("\n");
}

export function createXShareUrl(
  result: ChallengeResult,
  url: string,
): string {
  const intent = new URL("https://x.com/intent/post");
  intent.searchParams.set("text", createShareText(result, url));
  return intent.toString();
}
```

Import `resultOutcome` from the challenge module.

- [ ] **Step 4: Add a failing Web Share URL de-duplication test**

Tighten the unsupported-file test:

```ts
expect(share).toHaveBeenCalledWith({
  title: "勝利不能？じゃんけんAI — YOU ARE NOT RANDOM",
  text: expect.not.stringContaining("https://example.test/"),
  url: "https://example.test/",
});
```

Run:

```bash
npm test -- src/sharing/resultCard.test.ts
```

Expected: FAIL because the Web Share text still contains the URL.

- [ ] **Step 5: Implement Web Share text without the duplicated URL**

Add a small internal builder and use it in the non-file branch:

```ts
function createShareBody(result: ChallengeResult): string {
  return [...shareLines(result), "#勝利不能じゃんけんAI"].join("\n");
}

await navigator.share({
  title: SHARE_TITLE,
  text: createShareBody(result),
  url,
});
```

Keep file sharing and clipboard sharing on `createShareText`, because those payloads do not pass a separate URL field.

- [ ] **Step 6: Add a failing victory-canvas assertion**

After installing the canvas, inspect its calls:

```ts
const context = installCanvas();
await createResultPng(humanVictory);
expect(context.fillText).toHaveBeenCalledWith(
  "HUMAN VICTORY",
  expect.any(Number),
  expect.any(Number),
);
expect(context.fillText).toHaveBeenCalledWith(
  "勝利不能、ではなかった。",
  expect.any(Number),
  expect.any(Number),
);
```

Run the focused tests and expect failure because the old canvas is hypothesis-only.

- [ ] **Step 7: Render the victory variant and use the native font stack**

Split the canvas content into `drawVictoryCard` and `drawAnalysisCard`. In the victory branch draw:

```ts
context.font =
  '800 70px "Hiragino Sans", "Yu Gothic", Meiryo, system-ui, sans-serif';
context.fillText("HUMAN VICTORY", 104, 210);
context.font =
  '700 31px "Hiragino Sans", "Yu Gothic", Meiryo, system-ui, sans-serif';
context.fillText("勝利不能、ではなかった。", 104, 278);
context.font = '700 30px "DM Mono", monospace';
context.fillText(
  `YOU ${result.humanWins}  —  ${result.aiWins} AI  /  DRAW ${result.draws}`,
  104,
  446,
);
```

Keep `drawAnalysisCard` for AI victory and draw results, and replace its Manrope/Noto stack with the same native stack.

- [ ] **Step 8: Run sharing tests and commit**

Run:

```bash
npm test -- src/sharing/resultCard.test.ts
```

Expected: all result sharing tests pass.

Commit:

```bash
git add src/sharing/resultCard.ts src/sharing/resultCard.test.ts
git commit -m "feat: add X sharing and victory result cards"
```

### Task 3: Build the accessible victory animation

**Files:**
- Create: `src/components/VictoryCelebration.tsx`
- Create: `src/components/VictoryCelebration.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create tests that describe the public behavior:

```tsx
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VictoryCelebration } from "./VictoryCelebration";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("renders final scores immediately when celebration is inactive", () => {
  render(
    <VictoryCelebration
      active={false}
      humanWins={26}
      aiWins={19}
      draws={5}
    />,
  );
  expect(screen.getByText("26")).toBeVisible();
  expect(screen.queryByTestId("victory-confetti")).toBeNull();
});

it("removes active confetti after the entrance animation", () => {
  vi.useFakeTimers();
  render(
    <VictoryCelebration
      active
      humanWins={26}
      aiWins={19}
      draws={5}
    />,
  );
  expect(screen.getByTestId("victory-confetti")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(2_200));
  expect(screen.queryByTestId("victory-confetti")).toBeNull();
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
npm test -- src/components/VictoryCelebration.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement decoration lifetime and reduced-motion-aware count-up**

Create a component with:

```tsx
const CONFETTI = Array.from({ length: 28 }, (_, index) => index);

function reduceMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function AnimatedNumber({
  value,
  active,
}: {
  readonly value: number;
  readonly active: boolean;
}) {
  const shouldAnimate = active && !reduceMotion();
  const [display, setDisplay] = useState(shouldAnimate ? 0 : value);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplay(value);
      return;
    }
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 800);
      setDisplay(Math.round(value * progress));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [shouldAnimate, value]);

  return <>{display}</>;
}
```

`VictoryCelebration` should render the burst, stamp, three visual score values, a final-value `.sr-only` sentence, and confetti only while its 2.2-second timer is active. Mark the entire decorative layer `aria-hidden`, while the final score sentence remains available outside that hidden layer.

- [ ] **Step 4: Add and pass the reduced-motion test**

Mock `matchMedia` to return `matches: true`, render with `active`, and assert the final number is present without scheduling `requestAnimationFrame`.

Run:

```bash
npm test -- src/components/VictoryCelebration.test.tsx
```

Expected: all celebration tests pass without act warnings.

- [ ] **Step 5: Commit the animation component**

```bash
git add src/components/VictoryCelebration.tsx src/components/VictoryCelebration.test.tsx
git commit -m "feat: add accessible victory celebration"
```

### Task 4: Integrate the victory result and sharing hierarchy

**Files:**
- Modify: `src/components/ChallengeResult.tsx`
- Test: `src/components/ChallengeResult.test.tsx`

- [ ] **Step 1: Write failing human-victory UI tests**

Extend the sharing mock with `createXShareUrl`, create a winning fixture, and test:

```tsx
createXShareUrl: vi.fn(
  () => "https://x.com/intent/post?text=human-victory",
),

it("turns a human win into the full victory result", () => {
  render(
    <ChallengeResult
      result={{ ...result, humanWins: 26, aiWins: 19, draws: 5 }}
      celebrate
      onContinue={() => undefined}
      onRetry={() => undefined}
      onOpenLab={() => undefined}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "HUMAN VICTORY" }),
  ).toHaveFocus();
  expect(screen.getByText("勝利不能、ではなかった。")).toBeVisible();
  expect(screen.getByText("VICTORY", { selector: ".victory-stamp" })).toBeVisible();
});

it("exposes a safe direct X link before the other share actions", () => {
  render(/* winning ChallengeResult */);
  const link = screen.getByRole("link", { name: /Xでシェア/ });
  expect(link).toHaveAttribute(
    "href",
    "https://x.com/intent/post?text=human-victory",
  );
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  expect(screen.getByRole("button", { name: "画像付きでシェア" })).toBeVisible();
});
```

- [ ] **Step 2: Run the focused component test and verify RED**

Run:

```bash
npm test -- src/components/ChallengeResult.test.tsx
```

Expected: FAIL because `celebrate`, victory content, and the X link are missing.

- [ ] **Step 3: Implement outcome-specific result markup**

Add `celebrate?: boolean`, call `resultOutcome(result)`, and render the victory heading and message only for `human-victory`. Render `VictoryCelebration` inside the full-width panel:

```tsx
const outcome = resultOutcome(result);
const isHumanVictory = outcome === "human-victory";

<section
  className={`card challenge-result result-${outcome}`}
  aria-labelledby="result-title"
>
  {isHumanVictory && (
    <VictoryCelebration
      active={celebrate}
      humanWins={result.humanWins}
      aiWins={result.aiWins}
      draws={result.draws}
    />
  )}
  <div className="result-heading">
    <p className="eyebrow">
      {isHumanVictory
        ? "50 ROUNDS COMPLETE / HUMAN VICTORY"
        : "ANALYSIS COMPLETE / 50 ROUNDS"}
    </p>
    <h2 id="result-title" ref={titleRef} tabIndex={-1}>
      {isHumanVictory ? "HUMAN VICTORY" : "分析完了"}
    </h2>
    <p>
      {isHumanVictory
        ? "勝利不能、ではなかった。"
        : "あなたの50戦から、AIが最も強く支持した仮説です。"}
    </p>
  </div>
```

Keep diagnosis, final score, continue, LAB, and retry content in both branches.

- [ ] **Step 4: Implement the direct X link and action labels**

Create the URL once:

```tsx
const currentUrl = window.location.href;
const xShareUrl = createXShareUrl(result, currentUrl);
```

Render actions in this order:

```tsx
<a
  className="primary-action x-share-action"
  href={xShareUrl}
  target="_blank"
  rel="noopener noreferrer"
>
  Xでシェア
  <span className="sr-only">（新しいタブで開きます）</span>
</a>
<button type="button" onClick={/* existing Web Share run */}>
  画像付きでシェア
</button>
<button type="button" onClick={/* existing download run */}>
  結果画像を保存
</button>
<button type="button" onClick={/* existing copy run */}>
  投稿文をコピー
</button>
```

Do not disable the X link, continue, LAB, or retry while an unrelated asynchronous share operation is busy.

- [ ] **Step 5: Update existing action tests and verify GREEN**

Update button names from `結果をシェア` to `画像付きでシェア` and from `画像を保存` to `結果画像を保存`.

Run:

```bash
npm test -- src/components/ChallengeResult.test.tsx
```

Expected: all ChallengeResult tests pass.

- [ ] **Step 6: Commit the result integration**

```bash
git add src/components/ChallengeResult.tsx src/components/ChallengeResult.test.tsx
git commit -m "feat: present human victory and direct X sharing"
```

### Task 5: Trigger celebration only on live round 50

**Files:**
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing live-transition assertion**

After the existing 50-click loop, assert that the result panel carries the active celebration marker:

```tsx
expect(
  screen.getByRole("region", { name: "HUMAN VICTORY" }),
).toHaveAttribute("data-celebrate", "true");
```

Add a restored-result test by storing a completed persisted state before rendering, then assert:

```tsx
import { saveState } from "../storage/localStorage";
import { DEFAULT_PERSISTED_STATE } from "./initialState";

saveState({
  ...DEFAULT_PERSISTED_STATE,
  learningStats: {
    ...DEFAULT_PERSISTED_STATE.learningStats,
    totalRounds: 50,
    humanWins: 26,
    aiWins: 19,
    draws: 5,
  },
  challenge: {
    status: "result",
    baseline: {
      totalRounds: 0,
      humanWins: 0,
      aiWins: 0,
      draws: 0,
    },
    result: {
      completedAt: 123,
      humanWins: 26,
      aiWins: 19,
      draws: 5,
      expertId: "repeat-last",
      expertName: "Repeat Last",
      suspicionText: "直前と同じ手をもう一度出す傾向を疑っています",
      support: 0.4,
    },
  },
});

render(<App random={() => 0} />);
expect(
  screen.getByRole("region", { name: "HUMAN VICTORY" }),
).not.toHaveAttribute("data-celebrate", "true");
```

- [ ] **Step 2: Run the focused App test and verify RED**

Run:

```bash
npm test -- src/app/App.test.tsx
```

Expected: FAIL because `App` does not detect or pass the transition.

- [ ] **Step 3: Implement ephemeral transition detection**

Import `useRef`, initialize it from the restored status, derive the current render flag, and update after each render:

```tsx
const previousChallengeStatus = useRef(state.challenge.status);
const celebrate =
  previousChallengeStatus.current !== "result" &&
  state.challenge.status === "result";

useEffect(() => {
  previousChallengeStatus.current = state.challenge.status;
}, [state.challenge.status]);
```

Pass `celebrate={celebrate}` to `ChallengeResult`. Add
`data-celebrate={celebrate ? "true" : undefined}` and
`aria-label={isHumanVictory ? "HUMAN VICTORY" : "50戦の分析結果"}` to its result section so behavior can be tested semantically.

- [ ] **Step 4: Verify live, continued, and restored behavior**

Run:

```bash
npm test -- src/app/App.test.tsx src/storage/localStorage.test.ts
```

Expected: both files pass; continuing and reopening the frozen result do not alter persisted history.

- [ ] **Step 5: Commit the live trigger**

```bash
git add src/app/App.tsx src/app/App.test.tsx src/components/ChallengeResult.tsx
git commit -m "feat: animate only live challenge victories"
```

### Task 6: Style the full-width celebration and natural typography

**Files:**
- Modify: `src/styles/index.css`
- Test: `src/components/ChallengeResult.test.tsx`
- Test: `src/components/VictoryCelebration.test.tsx`

- [ ] **Step 1: Add failing structural class assertions**

Assert the winning section has `result-human-victory`, the stamp has `victory-stamp`, and the confetti field is absent for `celebrate={false}`. Run both component test files and verify the structural assertions fail before CSS/markup alignment.

- [ ] **Step 2: Replace the primary font import and variables**

Keep DM Mono but remove Manrope from the remote import:

```css
@import url("https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap");

:root {
  font-family:
    "Hiragino Sans",
    "Yu Gothic",
    "YuGothic",
    "Meiryo",
    system-ui,
    sans-serif;
  --sans:
    "Hiragino Sans",
    "Yu Gothic",
    "YuGothic",
    "Meiryo",
    system-ui,
    sans-serif;
}
```

- [ ] **Step 3: Add the full-width victory styles**

Style these selectors without changing non-winning result behavior:

```css
.result-human-victory {
  isolation: isolate;
  border-color: rgba(255, 204, 102, 0.42);
  background:
    radial-gradient(circle at 72% 14%, rgba(255, 204, 102, 0.2), transparent 30rem),
    linear-gradient(145deg, rgba(255, 255, 255, 0.025), transparent 48%),
    var(--surface);
}

.result-human-victory .result-heading h2 {
  max-width: 980px;
  color: #fff1bc;
  font-family: var(--sans);
  font-size: clamp(48px, 8vw, 112px);
  font-weight: 800;
  letter-spacing: -0.055em;
  text-wrap: balance;
}

.victory-stamp {
  position: absolute;
  top: clamp(30px, 5vw, 64px);
  right: clamp(24px, 6vw, 88px);
  transform: rotate(7deg);
}

.result-actions a,
.result-actions button {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  text-decoration: none;
}
```

Add deterministic confetti positions using CSS custom properties from the component, a radial burst, stamp entrance, and 2.2-second fall animation. Ensure the result content has a higher stacking level than decorations.

- [ ] **Step 4: Add responsive and reduced-motion rules**

At `max-width: 760px`, move the stamp into normal flow, stack all four share actions, reduce victory heading size, and keep every element inside 320px.

Add:

```css
@media (prefers-reduced-motion: reduce) {
  .victory-burst,
  .victory-stamp,
  .victory-confetti-piece,
  .result-human-victory .result-heading h2 {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 5: Run component tests and lint**

Run:

```bash
npm test -- src/components/ChallengeResult.test.tsx src/components/VictoryCelebration.test.tsx
npm run lint
```

Expected: both test files pass and ESLint exits with zero warnings.

- [ ] **Step 6: Commit the visual treatment**

```bash
git add src/styles/index.css src/components/ChallengeResult.tsx src/components/ChallengeResult.test.tsx src/components/VictoryCelebration.tsx src/components/VictoryCelebration.test.tsx
git commit -m "style: add responsive human victory treatment"
```

### Task 7: Full verification and delivery

**Files:**
- Verify: all source and test files changed above

- [ ] **Step 1: Run the complete automated verification**

Run:

```bash
npm test -- --run
npm run lint
npm run build
git diff --check
```

Expected: all tests pass, lint has zero warnings, production build exits 0, and `git diff --check` prints nothing.

- [ ] **Step 2: Run visual browser checks**

Start the app:

```bash
npm run dev -- --host 127.0.0.1
```

Check desktop and 390px mobile layouts for:

- live human victory: confetti, burst, stamp, count-up, full-width panel;
- restored human victory: final design without entrance confetti;
- AI victory and draw: no congratulatory treatment;
- X link contains the encoded frozen score and opens in a new tab;
- all four share actions, continue, LAB, and retry remain usable;
- no horizontal overflow or clipped focus rings;
- reduced-motion emulation shows final values without movement.

- [ ] **Step 3: Review the diff against the approved design**

Run:

```bash
git status --short
git diff 30cbfed...HEAD --stat
git diff 30cbfed...HEAD
```

Confirm every design requirement maps to an implementation or test, and no `.superpowers/brainstorm/` artifact is tracked.

- [ ] **Step 4: Commit any verification-only adjustment**

If the visual check requires a change, first add a failing component test where behavior is testable, make the minimal fix, rerun the complete verification, then commit only the related files with a specific message.

- [ ] **Step 5: Integrate and push**

From the primary worktree:

```bash
git merge --ff-only feature/human-victory-x-share
git push origin main
```

Confirm:

```bash
git status --short --branch
git log -1 --oneline --decorate
```

Expected: `main` is synchronized with `origin/main`; only intentionally ignored or local-only brainstorming artifacts may remain.
