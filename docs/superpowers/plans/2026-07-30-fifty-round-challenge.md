# 50戦チャレンジと共有導線 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「勝利不能？じゃんけんAI」として、50戦チャレンジ、固定診断、PLAY / LAB、結果共有、OGPを既存の研究デモへ追加する。

**Architecture:** 既存のゲームエンジンとオンライン学習は変更せず、新しい純粋な`challenge`ドメインが進捗、50戦スナップショット、継続状態を管理する。React reducerがラウンド完了後にchallengeを更新し、schema v3 storageが累積学習状態と固定診断を別々に保存する。PLAYは一般向けの対戦導線、LABは既存の研究パネルを表示し、共有画像は固定診断からクライアントサイドCanvasで生成する。

**Tech Stack:** React 19、TypeScript 6、Vitest、Testing Library、Canvas API、Web Share API、Clipboard API、Vite

---

## File map

- Create `src/challenge/challenge.ts`: 50戦の進捗、状態遷移、固定結果、共有用表示値。
- Create `src/challenge/challenge.test.ts`: challenge純粋関数の境界テスト。
- Modify `src/app/initialState.ts`: challengeとactive viewをAppStateへ追加。
- Modify `src/app/appReducer.ts`: play、continue、retry、tab切り替えを一元更新。
- Modify `src/app/appReducer.test.ts`: 49/50/51戦、続行、再挑戦、全resetを検証。
- Modify `src/storage/localStorage.ts`: schema v3、challenge保存、v2移行。
- Modify `src/storage/localStorage.test.ts`: v3 round trip、v2 migration、reload復元。
- Create `src/components/ViewTabs.tsx`: accessibleなPLAY / LABタブ。
- Create `src/components/ViewTabs.test.tsx`: clickとkeyboard navigation。
- Create `src/components/ChallengeProgress.tsx`: 50戦進捗と分析段階。
- Modify `src/components/CurrentSuspicion.tsx`: 「支持度」表現と8戦未満の分析中表示。
- Modify `src/components/GamePanel.tsx`: challenge結果表示中の対戦停止をpropsで表現。
- Create `src/sharing/resultCard.ts`: 投稿文、Canvas PNG、共有、保存、コピー。
- Create `src/sharing/resultCard.test.ts`: 投稿文とAPI fallback。
- Create `src/components/ChallengeResult.tsx`: 固定診断と共有アクション。
- Create `src/components/ChallengeResult.test.tsx`: 結果、状態通知、各アクション。
- Modify `src/app/App.tsx`: 新タイトル、PLAY / LAB、結果画面、導線を統合。
- Modify `src/app/App.test.tsx`: end-to-end component behavior。
- Modify `src/styles/index.css`: 新hero、tabs、progress、result、responsive、focus。
- Create `public/og-image.svg`: OGP画像の編集可能な原本。
- Create `public/og-image.png`: 1200×630の配信用OGP画像。
- Modify `index.html`: title、description、canonical、Open Graph、X Card。
- Modify `README.md`: 50戦チャレンジ、共有、PLAY / LAB、schema v3を反映。

### Task 1: Challenge domain

**Files:**
- Create: `src/challenge/challenge.ts`
- Create: `src/challenge/challenge.test.ts`

- [ ] **Step 1: Write failing boundary and snapshot tests**

```ts
import { describe, expect, it } from "vitest";
import { EXPERTS } from "../learning/experts";
import { createLearningStats } from "../learning/learningStats";
import {
  CHALLENGE_ROUNDS,
  advanceChallenge,
  challengeProgress,
  continueChallenge,
  createChallengeState,
} from "./challenge";

const baselineStats = createLearningStats();
const weights = EXPERTS.map((_, index) => (index === 6 ? 0.4 : 0.6 / 23));

describe("50-round challenge", () => {
  it("stays active through round 49 and snapshots round 50 once", () => {
    const challenge = createChallengeState(baselineStats);
    const at49 = { ...baselineStats, totalRounds: 49, aiWins: 20, humanWins: 18, draws: 11 };
    expect(advanceChallenge(challenge, at49, weights, 1000).result).toBeNull();

    const at50 = { ...at49, totalRounds: 50, aiWins: 21 };
    const completed = advanceChallenge(challenge, at50, weights, 2000);
    expect(completed.status).toBe("result");
    expect(completed.result).toMatchObject({
      aiWins: 21,
      humanWins: 18,
      draws: 11,
      expertId: EXPERTS[6]?.id,
      support: 0.4,
    });

    const at51 = { ...at50, totalRounds: 51, humanWins: 19 };
    expect(advanceChallenge(completed, at51, weights.map(() => 1 / 24), 3000).result)
      .toEqual(completed.result);
  });

  it("continues without losing the frozen result", () => {
    const completed = advanceChallenge(
      createChallengeState(baselineStats),
      { ...baselineStats, totalRounds: CHALLENGE_ROUNDS, draws: CHALLENGE_ROUNDS },
      weights,
      2000,
    );
    expect(continueChallenge(completed)).toMatchObject({
      status: "continued",
      result: completed.result,
    });
  });

  it("subtracts a migrated cumulative baseline from progress and scores", () => {
    const existing = { ...baselineStats, totalRounds: 65, aiWins: 24, humanWins: 21, draws: 20 };
    const challenge = createChallengeState(existing);
    const afterOne = { ...existing, totalRounds: 66, aiWins: 25 };
    expect(challengeProgress(challenge, afterOne)).toEqual({
      rounds: 1,
      aiWins: 1,
      humanWins: 0,
      draws: 0,
    });
  });
});
```

- [ ] **Step 2: Run the challenge test and verify failure**

Run: `npm test -- src/challenge/challenge.test.ts`

Expected: FAIL because `src/challenge/challenge.ts` does not exist.

- [ ] **Step 3: Implement the pure challenge state**

```ts
import type { LearningStats } from "../learning/learningStats";
import { EXPERTS } from "../learning/experts";

export const CHALLENGE_ROUNDS = 50;
export type ChallengeStatus = "active" | "result" | "continued";

export interface ChallengeBaseline {
  readonly totalRounds: number;
  readonly aiWins: number;
  readonly humanWins: number;
  readonly draws: number;
}

export interface ChallengeResult {
  readonly completedAt: number;
  readonly aiWins: number;
  readonly humanWins: number;
  readonly draws: number;
  readonly expertId: string;
  readonly expertName: string;
  readonly suspicionText: string;
  readonly support: number;
}

export interface ChallengeState {
  readonly status: ChallengeStatus;
  readonly baseline: ChallengeBaseline;
  readonly result: ChallengeResult | null;
}

export function createChallengeState(stats: LearningStats): ChallengeState {
  return {
    status: "active",
    baseline: {
      totalRounds: stats.totalRounds,
      aiWins: stats.aiWins,
      humanWins: stats.humanWins,
      draws: stats.draws,
    },
    result: null,
  };
}

export function challengeProgress(challenge: ChallengeState, stats: LearningStats) {
  return {
    rounds: Math.max(0, stats.totalRounds - challenge.baseline.totalRounds),
    aiWins: Math.max(0, stats.aiWins - challenge.baseline.aiWins),
    humanWins: Math.max(0, stats.humanWins - challenge.baseline.humanWins),
    draws: Math.max(0, stats.draws - challenge.baseline.draws),
  };
}

export function advanceChallenge(
  challenge: ChallengeState,
  stats: LearningStats,
  weights: readonly number[],
  completedAt: number,
): ChallengeState {
  if (challenge.result !== null || challengeProgress(challenge, stats).rounds < CHALLENGE_ROUNDS) {
    return challenge;
  }
  const topIndex = weights.reduce(
    (best, weight, index) => weight > (weights[best] ?? -Infinity) ? index : best,
    0,
  );
  const expert = EXPERTS[topIndex] ?? EXPERTS[0]!;
  const progress = challengeProgress(challenge, stats);
  return {
    ...challenge,
    status: "result",
    result: {
      completedAt,
      aiWins: progress.aiWins,
      humanWins: progress.humanWins,
      draws: progress.draws,
      expertId: expert.id,
      expertName: expert.name,
      suspicionText: expert.suspicionText,
      support: weights[topIndex] ?? 1 / EXPERTS.length,
    },
  };
}

export function continueChallenge(challenge: ChallengeState): ChallengeState {
  return challenge.result === null ? challenge : { ...challenge, status: "continued" };
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/challenge/challenge.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the domain**

```bash
git add src/challenge/challenge.ts src/challenge/challenge.test.ts
git commit -m "feat: add fifty-round challenge domain"
```

### Task 2: Reducer integration and retry semantics

**Files:**
- Modify: `src/app/initialState.ts`
- Modify: `src/app/appReducer.ts`
- Modify: `src/app/appReducer.test.ts`

- [ ] **Step 1: Add failing reducer tests**

Add tests which play exactly 50 deterministic rounds and assert:

```ts
expect(state.challenge.status).toBe("result");
expect(state.challenge.result).not.toBeNull();

const blocked = appReducer(state, { type: "play", humanHand: "rock", random: zeroRandom });
expect(blocked.learningStats.totalRounds).toBe(50);

const continued = appReducer(state, { type: "continue-challenge" });
const round51 = appReducer(continued, { type: "play", humanHand: "rock", random: zeroRandom });
expect(round51.learningStats.totalRounds).toBe(51);
expect(round51.challenge.result).toEqual(state.challenge.result);
```

Add a retry test:

```ts
const retried = appReducer(round51, { type: "retry-challenge", random: zeroRandom });
expect(retried.learningStats.totalRounds).toBe(0);
expect(retried.challenge.result).toBeNull();
expect(retried.alpha).toBe(round51.alpha);
expect(retried.learningEnabled).toBe(round51.learningEnabled);
```

- [ ] **Step 2: Run reducer tests and verify failure**

Run: `npm test -- src/app/appReducer.test.ts`

Expected: FAIL because challenge state and actions are not defined.

- [ ] **Step 3: Add challenge state and actions**

In `AppState` add:

```ts
readonly challenge: ChallengeState;
readonly activeView: "play" | "lab";
```

Initialize persisted state with `createChallengeState(learningStats)` and `"play"`.
Extend `AppAction` with:

```ts
| { readonly type: "set-view"; readonly view: "play" | "lab" }
| { readonly type: "continue-challenge" }
| { readonly type: "retry-challenge"; readonly random?: RandomSource }
```

In the `play` branch, return unchanged state while `challenge.status === "result"`.
After `playPendingRound`, call:

```ts
const challenge = advanceChallenge(
  state.challenge,
  result.nextLearningStats,
  result.nextWeights,
  result.record.timestamp,
);
```

`continue-challenge` applies `continueChallenge`. `retry-challenge` creates a clean
learning state and pending round while copying `alpha` and `learningEnabled`.
`reset` continues to restore all defaults.

- [ ] **Step 4: Run reducer tests**

Run: `npm test -- src/app/appReducer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit reducer integration**

```bash
git add src/app/initialState.ts src/app/appReducer.ts src/app/appReducer.test.ts
git commit -m "feat: integrate challenge lifecycle"
```

### Task 3: Schema v3 persistence and v2 migration

**Files:**
- Modify: `src/storage/localStorage.ts`
- Modify: `src/storage/localStorage.test.ts`
- Modify: `src/app/initialState.ts`

- [ ] **Step 1: Write failing persistence tests**

Extend `defaults` with challenge state and `activeView`. Verify v3 round trip:

```ts
expect(SCHEMA_VERSION).toBe(3);
saveState({ ...defaults, activeView: "lab" });
expect(loadState(defaults).activeView).toBe("lab");
```

Create a schema v2 envelope under `you-are-not-random:v2` and assert migration:

```ts
expect(migrated.learningStats.totalRounds).toBe(legacyStats.totalRounds);
expect(migrated.challenge.baseline.totalRounds).toBe(legacyStats.totalRounds);
expect(migrated.challenge.result).toBeNull();
expect(migrated.activeView).toBe("play");
```

Persist a completed challenge plus 65-round stats, reload, and assert:

```ts
expect(restored.challenge.status).toBe("result");
expect(restored.challenge.result).toEqual(completedResult);
expect(restored.learningStats.totalRounds).toBe(65);
```

- [ ] **Step 2: Run storage tests and verify failure**

Run: `npm test -- src/storage/localStorage.test.ts`

Expected: FAIL because schema v3 and challenge validation are missing.

- [ ] **Step 3: Implement schema v3**

Use:

```ts
export const STORAGE_KEY = "you-are-not-random:v3";
export const SCHEMA_VERSION = 3;
const V2_STORAGE_KEY = "you-are-not-random:v2";
```

Add `challenge` and `activeView` to `PersistedAppState` and `StoredState`.
Validate every baseline count as a non-negative integer, status against the three
literal values, support as a finite value in `[0, 1]`, and fixed-result strings as
non-empty strings. On load:

1. Parse and validate v3.
2. If missing, parse the existing v2 envelope and its `v2:round` slots.
3. Return its cumulative learning state with
   `challenge: createChallengeState(legacy.learningStats)` and `activeView: "play"`.
4. When a v3 fixed result exists, normalize the restored status to `"result"` so
   reload always shows the 50-round diagnosis while retaining later rounds, and
   normalize `activeView` to `"play"` so the result is the first visible panel.

Save new rounds only to v3 ring slots. `clearSavedState` removes v1/v2/v3 metadata
and v2/v3 ring slots without touching unrelated keys.

- [ ] **Step 4: Run storage and reducer tests**

Run: `npm test -- src/storage/localStorage.test.ts src/app/appReducer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit persistence**

```bash
git add src/storage/localStorage.ts src/storage/localStorage.test.ts src/app/initialState.ts
git commit -m "feat: persist challenge snapshots"
```

### Task 4: PLAY / LAB navigation and progress

**Files:**
- Create: `src/components/ViewTabs.tsx`
- Create: `src/components/ViewTabs.test.tsx`
- Create: `src/components/ChallengeProgress.tsx`
- Modify: `src/components/CurrentSuspicion.tsx`
- Modify: `src/components/GamePanel.tsx`

- [ ] **Step 1: Write failing tab tests**

```tsx
render(<ViewTabs value="play" onChange={onChange} />);
await user.click(screen.getByRole("tab", { name: "LAB" }));
expect(onChange).toHaveBeenCalledWith("lab");
screen.getByRole("tab", { name: "PLAY" }).focus();
await user.keyboard("{ArrowRight}");
expect(screen.getByRole("tab", { name: "LAB" })).toHaveFocus();
expect(onChange).toHaveBeenCalledWith("lab");
```

- [ ] **Step 2: Run the tab test and verify failure**

Run: `npm test -- src/components/ViewTabs.test.tsx`

Expected: FAIL because `ViewTabs` does not exist.

- [ ] **Step 3: Implement tabs and progress**

`ViewTabs` renders a `role="tablist"` with two buttons, `aria-selected`,
`aria-controls`, roving `tabIndex`, ArrowLeft/ArrowRight/Home/End handling.

`ChallengeProgress` receives `rounds` and renders:

```tsx
const stage = rounds < 8 ? "分析中" : rounds < 50 ? "暫定仮説" : "診断完了";
const completed = Math.min(rounds, 50);
return (
  <section className="challenge-progress" aria-labelledby="challenge-title">
    <p className="eyebrow">50 ROUND CHALLENGE</p>
    <h2 id="challenge-title">50回、AIに癖を見抜かれずにいられる？</h2>
    <div className="challenge-progress-value">
      <strong>{completed}</strong><span>/ 50</span><b>{stage}</b>
    </div>
    <progress max={50} value={completed}>{completed} / 50</progress>
  </section>
);
```

Change CurrentSuspicion’s threshold to 8 rounds, label the value
`現在の支持度`, and add `Hedge weight`. Add a `disabled` prop to GamePanel
and disable all hand buttons while the result screen is active.

- [ ] **Step 4: Run component tests**

Run: `npm test -- src/components/ViewTabs.test.tsx src/app/App.test.tsx`

Expected: PASS for existing App tests and the new tabs.

- [ ] **Step 5: Commit navigation components**

```bash
git add src/components/ViewTabs.tsx src/components/ViewTabs.test.tsx src/components/ChallengeProgress.tsx src/components/CurrentSuspicion.tsx src/components/GamePanel.tsx
git commit -m "feat: add play and lab navigation"
```

### Task 5: Result sharing utilities and result component

**Files:**
- Create: `src/sharing/resultCard.ts`
- Create: `src/sharing/resultCard.test.ts`
- Create: `src/components/ChallengeResult.tsx`
- Create: `src/components/ChallengeResult.test.tsx`

- [ ] **Step 1: Write failing sharing tests**

```ts
const text = createShareText(result, "https://example.test/");
expect(text).toContain("AIに「直前と同じ手をもう一度出す傾向」を疑われました");
expect(text).toContain("あなた 18勝 / AI 21勝 / 11分");
expect(text).toContain("#勝利不能じゃんけんAI");
expect(text).not.toContain("あなたはRepeat Last型です");
```

Mock `navigator.share`, `navigator.clipboard.writeText`, Canvas
`getContext`/`toBlob`, `URL.createObjectURL`, and an anchor click. Verify the
utility uses image-file share only when `navigator.canShare({ files })` returns
true and throws a user-facing `Error` when Canvas cannot produce a Blob.

- [ ] **Step 2: Run sharing tests and verify failure**

Run: `npm test -- src/sharing/resultCard.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement client-side result image APIs**

Export:

```ts
export function createShareText(result: ChallengeResult, url: string): string;
export function createResultPng(result: ChallengeResult): Promise<Blob>;
export function shareResult(result: ChallengeResult, url: string): Promise<void>;
export function downloadResult(result: ChallengeResult): Promise<void>;
export function copyResultText(result: ChallengeResult, url: string): Promise<void>;
```

Create a 1200×630 Canvas, paint the existing `#061011` background, cyan grid and
accent, then draw the title, subtitle, suspicion text, 50-round score, expert name,
support percentage, and call-to-action. Wrap Japanese lines by measured width.
Reject with `結果画像を生成できませんでした。` when the context or Blob is absent.

For `shareResult`, prefer a PNG `File` when `navigator.canShare({ files })`; otherwise
use text/title/url Web Share. If Web Share is unavailable, throw
`このブラウザでは共有メニューを利用できません。画像保存か投稿文コピーをお使いください。`.

- [ ] **Step 4: Implement and test ChallengeResult**

Render a focusable result heading, fixed score, suspicion, support label, and buttons:

```text
結果をシェア
画像を保存
投稿文をコピー
LABで詳しい分析を見る
じゃんけんを続ける
もう一度挑戦する
```

Use an `aria-live="polite"` status area for success/failure messages. Confirm retry
with `window.confirm` before invoking `onRetry`. Unit-test all callbacks and message
updates by mocking the sharing module.

Run: `npm test -- src/sharing/resultCard.test.ts src/components/ChallengeResult.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit result sharing**

```bash
git add src/sharing/resultCard.ts src/sharing/resultCard.test.ts src/components/ChallengeResult.tsx src/components/ChallengeResult.test.tsx
git commit -m "feat: add shareable challenge results"
```

### Task 6: App composition and accessible result flow

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/components/ScoreBoard.tsx`

- [ ] **Step 1: Write failing application-flow tests**

Add tests for:

```tsx
expect(screen.getByRole("heading", { name: "勝利不能？じゃんけんAI", level: 1 })).toBeVisible();
expect(screen.getByText("YOU ARE NOT RANDOM")).toBeVisible();
expect(screen.getByRole("tabpanel", { name: "PLAY" })).toBeVisible();
expect(screen.queryByText("Empirical regret")).toBeNull();
await user.click(screen.getByRole("tab", { name: "LAB" }));
expect(screen.getByText("Empirical regret")).toBeVisible();
```

Play 50 rounds, assert the result heading receives focus and hand buttons are absent
or disabled. Click `じゃんけんを続ける`, play once more, and assert round 51 is shown.
Switch to LAB and assert cumulative round 51 while the share result remains 50 rounds.

- [ ] **Step 2: Run App tests and verify failure**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because the new composition is not present.

- [ ] **Step 3: Compose PLAY and LAB**

Update the header/hero to:

```tsx
<h1>勝利不能？<br /><em>じゃんけんAI</em></h1>
<p className="hero-subtitle">YOU ARE NOT RANDOM</p>
```

Derive `progress = challengeProgress(state.challenge, state.learningStats)`.
PLAY tab renders `ChallengeProgress`, GamePanel, a challenge-only ScoreBoard, and
CurrentSuspicion. LAB renders RegretPanel, TransitionMatrix, SettingsPanel,
ExpertWeights, HistoryPanel, and a concise “HOW IT WORKS” note.

Keep the tabs available after completion. In the PLAY panel, when
`state.challenge.status === "result"` and `challenge.result` exists, render
ChallengeResult in place of the normal play grid. `LABで詳しい分析を見る` dispatches
`set-view: lab` without discarding the result; provide a `50戦の診断へ戻る` control
in LAB which dispatches `set-view: play`.
`じゃんけんを続ける` dispatches `continue-challenge`; retry dispatches
`retry-challenge` after confirmation.

Change ScoreBoard to accept an optional heading and score values so PLAY displays
the current challenge’s baseline-subtracted counts, while LAB/history continue to
use cumulative totals.

- [ ] **Step 4: Run application and full component tests**

Run: `npm test -- src/app/App.test.tsx src/components`

Expected: PASS.

- [ ] **Step 5: Commit app composition**

```bash
git add src/app/App.tsx src/app/App.test.tsx src/components/ScoreBoard.tsx
git commit -m "feat: build fifty-round play experience"
```

### Task 7: Visual system, responsive layout, and OGP

**Files:**
- Modify: `src/styles/index.css`
- Create: `public/og-image.svg`
- Create: `public/og-image.png`
- Modify: `index.html`

- [ ] **Step 1: Add metadata assertions**

Add an App test that verifies the new visible title. Manually inspect `index.html`
with:

```bash
rg -n 'canonical|og:title|og:description|og:image|twitter:card|勝利不能' index.html
```

Expected after implementation: every metadata field is present once.

- [ ] **Step 2: Add focused styles**

Add CSS for `.view-tabs`, `[role="tabpanel"]`, `.challenge-progress`,
`.challenge-progress-value`, `.challenge-result`, `.result-score`,
`.result-actions`, `.share-status`, `.lab-intro`, `.diagnosis-return`, and the
new hero subtitle. Preserve current tokens and card language.

At `max-width: 760px`, make the result actions and scores single-column, keep hand
buttons at least 104px high, and remove nonessential header metadata. At
`prefers-reduced-motion`, disable new transitions and scrolling animation.

- [ ] **Step 3: Create OGP assets**

Create `public/og-image.svg` at exactly 1200×630 using the same colors and text:

```text
勝利不能？じゃんけんAI
YOU ARE NOT RANDOM
50 ROUNDS / 24 HYPOTHESES
あなたはAIに読まれずにいられる？
```

Render it to `public/og-image.png` at 1200×630 and verify:

```bash
file public/og-image.png
```

Expected: PNG image data, 1200 x 630.

- [ ] **Step 4: Add metadata**

Use canonical URL
`https://rintaro-okahara.github.io/you-are-not-random/` and set:

```html
<title>勝利不能？じゃんけんAI — YOU ARE NOT RANDOM</title>
<meta property="og:type" content="website" />
<meta property="og:title" content="勝利不能？じゃんけんAI — YOU ARE NOT RANDOM" />
<meta property="og:image" content="https://rintaro-okahara.github.io/you-are-not-random/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
```

Add matching Japanese description, `og:url`, and Twitter title/description/image.

- [ ] **Step 5: Run static verification**

Run: `npm run lint && npm test && npm run build`

Expected: all commands exit 0 and `dist/og-image.png` exists.

- [ ] **Step 6: Commit visual and metadata work**

```bash
git add src/styles/index.css public/og-image.svg public/og-image.png index.html
git commit -m "feat: polish challenge visuals and social metadata"
```

### Task 8: Documentation, browser QA, and delivery

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update documentation**

Update the opening description, Screenshot, Features, localStorage, and UI sections
for the new title, 50-round fixed diagnosis, continuation semantics, client-side
sharing, PLAY / LAB, OGP, and schema v3 migration.

- [ ] **Step 2: Run full automated verification**

Run:

```bash
npm run lint
npm test
npm run build
git diff --check
```

Expected: lint 0 warnings, all tests pass, build succeeds, diff check is empty.

- [ ] **Step 3: Run browser visual QA**

Start Vite and inspect at 1440×1000, 768×1024, and 390×844:

- PLAY initial state and 7/8-round stage boundary
- PLAY/LAB tab click and keyboard behavior
- 50-round result and focus
- result sharing status and fallback
- continued round state
- LAB tables and horizontal overflow
- reduced-motion and visible focus
- no clipped title, controls, or result actions

Fix any visual defects and rerun the relevant tests.

- [ ] **Step 4: Commit documentation and QA fixes**

```bash
git add README.md src
git commit -m "docs: explain fifty-round challenge"
```

If browser QA required source fixes, include only those verified fixes in the same
commit and mention them in the commit body.

- [ ] **Step 5: Verify final branch and push**

Run:

```bash
git status --short
git log --oneline --decorate -10
git push origin main
```

Expected: clean worktree and successful update of `origin/main`.
