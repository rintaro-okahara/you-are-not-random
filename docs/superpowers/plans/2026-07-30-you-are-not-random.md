# You Are Not Random Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a tested, responsive, static React rock-paper-scissors app
whose Fixed Share learner combines 24 full-information experts.

**Architecture:** Keep all online-learning math in dependency-free pure
TypeScript modules. Use a reducer and a round engine to enforce the private
pending-round protocol, a guarded localStorage adapter for persistence, and
small React components for the dashboard.

**Tech Stack:** Vite, React, TypeScript strict mode, Vitest, React Testing
Library, ESLint, CSS, localStorage.

---

## File map

- `src/domain/{types,rps,probability}.ts`: canonical types, hands, payoff math,
  and normalized probability primitives.
- `src/learning/{expertHelpers,experts,prediction,hedge,regret}.ts`: predictors
  and online-learning equations.
- `src/engine/{sampling,gameEngine}.ts`: injectable randomness and round
  lifecycle.
- `src/stats/{aggregateStats,transitions}.ts`: dashboard derivations.
- `src/storage/localStorage.ts`: versioned, validated persistence.
- `src/app/{initialState,appReducer}.ts`: state construction and transitions.
- `src/components/*.tsx`: focused dashboard cards.
- `src/styles/index.css`: responsive dark visual system.
- `src/**/*.test.{ts,tsx}`: unit and integration tests beside their subjects.

### Task 1: Toolchain and test harness

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `src/test/setup.ts`

- [ ] Add scripts `dev`, `build`, `lint`, `test`, and `test:watch`, React 19,
  Vite, TypeScript, Vitest, jsdom, ESLint, and Testing Library dependencies.
- [ ] Configure Vite with `base: "./"`, React, and a jsdom test environment
  loading `src/test/setup.ts`.
- [ ] Enable strict TypeScript and lint rules for TypeScript and React hooks.
- [ ] Run `npm install`, then run an empty `npm test -- --run` to validate the
  harness before adding application code.

### Task 2: RPS domain and probability primitives

**Files:**
- Test: `src/domain/rps.test.ts`
- Test: `src/domain/probability.test.ts`
- Create: `src/domain/types.ts`
- Create: `src/domain/rps.ts`
- Create: `src/domain/probability.ts`

- [ ] Write failing tests asserting hand order, all nine payoffs, all three
  human-hand reward vectors, hand counters, probability normalization, and
  uniform fallback for invalid values.
- [ ] Run `npm test -- --run src/domain` and confirm failures are caused by
  missing modules.
- [ ] Implement `HANDS`, `PAYOFF_MATRIX`, `getPayoff`, `getOutcome`,
  `counterHand`, `cycleForward`, `cycleBackward`, `rewardVectorForHuman`,
  `UNIFORM_PROBABILITY`, `normalizeProbability`, `isProbabilityVector`, and
  shared immutable record types.
- [ ] Re-run the domain tests and confirm all pass.

### Task 3: Prediction and 24 experts

**Files:**
- Test: `src/learning/prediction.test.ts`
- Test: `src/learning/experts.test.ts`
- Create: `src/learning/prediction.ts`
- Create: `src/learning/expertHelpers.ts`
- Create: `src/learning/experts.ts`

- [ ] Write failing tests for uniform conversion, normalization, no negative
  values, stable softmax with large beta inputs, empty-history validity of all
  24 experts, Repeat Last, Period 3, conditional first-order Markov, higher
  order backoff, Win-Stay, and both Lose-Shift variants.
- [ ] Verify these tests fail because the learning modules do not exist.
- [ ] Implement smoothed one-hot, Laplace frequency, decayed frequency, streak,
  period, condition, and recursive Markov helpers.
- [ ] Define the ordered 24-expert registry with stable IDs, display copy,
  suspicion copy, and pure `predictHuman(history)` functions.
- [ ] Implement expected payoff, max-shifted softmax, beta 5, epsilon 0.05, and
  final normalized AI distributions.
- [ ] Run both learning test files and keep them green after extracting common
  helpers.

### Task 4: Hedge, Fixed Share, and regret

**Files:**
- Test: `src/learning/hedge.test.ts`
- Test: `src/learning/regret.test.ts`
- Create: `src/learning/hedge.ts`
- Create: `src/learning/regret.ts`

- [ ] Write failing tests for uniform weights, mixture normalization, increased
  weight for a better expert, alpha 0 Hedge equivalence, alpha 1 uniformity,
  repeated-update finiteness, positive share floor, and a hand-calculated
  regret fixture.
- [ ] Verify the failures, then implement `uniformWeights`,
  `mixDistributions`, `scoreExperts`, `updateFixedShare`, and
  `calculateRegret`.
- [ ] Normalize after exponentiation and after sharing, sanitizing non-finite
  reward and weight inputs.
- [ ] Run the Hedge and regret tests and confirm they pass.

### Task 5: Sampling and round engine

**Files:**
- Test: `src/engine/sampling.test.ts`
- Test: `src/engine/gameEngine.test.ts`
- Create: `src/engine/sampling.ts`
- Create: `src/engine/gameEngine.ts`

- [ ] Write failing tests that injected random values select deterministic
  bins, crypto-backed values remain in `[0,1)`, pending rounds use only
  completed history, played records expose the consumed distribution,
  learning-off rounds are uniform and freeze weights, learning-on rounds update
  all expert rewards, and history caps at 2,000.
- [ ] Verify red, then implement `secureRandom`, `sampleHand`,
  `preparePendingRound`, and `playPendingRound`.
- [ ] Keep the pending expert action distributions internal to the engine state
  so full-information rewards can be computed after the human move.
- [ ] Run engine tests and refactor only after all are green.

### Task 6: Statistics and storage

**Files:**
- Test: `src/stats/aggregateStats.test.ts`
- Test: `src/stats/transitions.test.ts`
- Test: `src/storage/localStorage.test.ts`
- Create: `src/stats/aggregateStats.ts`
- Create: `src/stats/transitions.ts`
- Create: `src/storage/localStorage.ts`

- [ ] Write failing tests for zero-game safe statistics, recent win rate,
  streak signs, Laplace-smoothed transition rows and sample counts, valid
  storage round trips, malformed JSON fallback, unknown schema fallback, and
  invalid expert-vector fallback.
- [ ] Verify red, implement the derivations, and define versioned storage key
  `you-are-not-random:v1`.
- [ ] Validate recovered hands, probability vectors, weights, settings, and
  records without using `any`; cap recovered history to the latest 2,000.
- [ ] Run stats and storage tests until green.

### Task 7: Reducer and application integration

**Files:**
- Test: `src/app/appReducer.test.ts`
- Create: `src/app/initialState.ts`
- Create: `src/app/appReducer.ts`
- Create: `src/app/App.tsx`
- Create: `src/main.tsx`

- [ ] Write failing reducer tests for initialized pending state, play, toggle,
  alpha update with clamp, and reset.
- [ ] Verify red, then implement the state initializer and reducer with random
  dependency injection for tests.
- [ ] Create `App` with storage load on initialization and storage save after
  state changes. Keep render-time data derivation memoized and side-effect free.
- [ ] Run reducer tests and confirm they pass.

### Task 8: Accessible dashboard UI

**Files:**
- Test: `src/app/App.test.tsx`
- Create: `src/components/GamePanel.tsx`
- Create: `src/components/ScoreBoard.tsx`
- Create: `src/components/CurrentSuspicion.tsx`
- Create: `src/components/ExpertWeights.tsx`
- Create: `src/components/RegretPanel.tsx`
- Create: `src/components/TransitionMatrix.tsx`
- Create: `src/components/HistoryPanel.tsx`
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/styles/index.css`

- [ ] Write failing RTL tests asserting no private probability before play,
  completed probability after play, learning-off notice, and reset clearing the
  visible history after confirmation.
- [ ] Verify red, then implement semantic components with large labeled hand
  buttons, visible focus states, text-plus-color results, accessible tables,
  and native range/switch controls.
- [ ] Implement the dark responsive grid, card hierarchy, probability bars,
  expert ranking, mobile breakpoints, and reduced-motion behavior in CSS.
- [ ] Run RTL tests and fix accessibility/name issues until green.

### Task 9: Documentation and static deployment

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `.github/workflows/deploy.yml`

- [ ] Document overview, screenshot guidance, setup, tests, build, GitHub Pages,
  Vercel, all 24 experts, Hedge equations, Fixed Share, full information,
  empirical best-fixed-expert regret, hidden current distribution, storage,
  limits, and caveats.
- [ ] Add a Pages workflow that installs with `npm ci`, verifies lint/tests,
  builds `dist`, and uploads/deploys the static artifact.
- [ ] Ignore dependencies, build output, coverage, local environment files, and
  editor/OS noise.

### Task 10: Final verification

**Files:**
- Modify as required by evidence from verification.

- [ ] Run `npm run lint` and fix every error and warning.
- [ ] Run `npm run test -- --run` and confirm the complete suite passes.
- [ ] Run `npm run build` and confirm Vite emits `dist` successfully.
- [ ] Start the production preview, open it at desktop and mobile widths, play
  several rounds, toggle learning, adjust alpha, reload to confirm persistence,
  and reset.
- [ ] Confirm the DOM contains no pending probability before play and no
  console errors.
