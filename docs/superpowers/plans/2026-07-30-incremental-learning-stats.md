# Incremental Learning Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove elapsed-history scans and full-history serialization from the
normal round path without changing expert predictions or learning parameters.

**Architecture:** Keep bounded immutable learning and regret accumulators in
application state. Experts consume shared aggregates, the UI derives from
aggregates, and localStorage uses fixed circular round slots plus metadata.

**Tech Stack:** TypeScript, React reducer, Vitest, localStorage.

---

### Task 1: Incremental aggregate state

**Files:**
- Create: `src/learning/learningStats.ts`
- Test: `src/learning/learningStats.test.ts`

- [ ] Write failing tests comparing stats built from history with repeated
  single-round updates for global, rolling, decay, Markov, streak, outcomes,
  and recent results.
- [ ] Implement empty, update, and legacy-history build functions with bounded
  arrays and order-1/2/3 context tables.
- [ ] Verify the focused test passes.

### Task 2: Expert prediction equivalence

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/learning/expertHelpers.ts`
- Modify: `src/learning/experts.ts`
- Modify: `src/learning/experts.test.ts`

- [ ] Add tests that build shared stats from representative histories and
  preserve all existing expert expectations.
- [ ] Change expert predictors to consume aggregate state only.
- [ ] Remove history-walking prediction helpers.
- [ ] Verify all expert and prediction tests pass.

### Task 3: Incremental regret and dashboard derivations

**Files:**
- Modify: `src/learning/regret.ts`
- Modify: `src/learning/regret.test.ts`
- Modify: `src/stats/aggregateStats.ts`
- Modify: `src/stats/transitions.ts`
- Modify: corresponding tests

- [ ] Write failing equivalence tests for regret, score totals, recent win
  rate, streak, and transition probabilities.
- [ ] Add `RegretStats` update/summarize functions.
- [ ] Derive match and transition views from `LearningStats`.
- [ ] Verify focused tests pass.

### Task 4: Round engine and reducer

**Files:**
- Modify: `src/engine/gameEngine.ts`
- Modify: `src/engine/gameEngine.test.ts`
- Modify: `src/app/initialState.ts`
- Modify: `src/app/appReducer.ts`
- Modify: reducer/UI tests and components

- [ ] Write failing tests that a round returns next learning/regret state and
  that React keeps at most 15 display records.
- [ ] Make pending preparation consume aggregates.
- [ ] Update aggregate and regret state once after record creation.
- [ ] Replace full app history with bounded recent history and total count.
- [ ] Verify engine, reducer, and UI tests pass.

### Task 5: Incremental localStorage

**Files:**
- Modify: `src/storage/localStorage.ts`
- Modify: `src/storage/localStorage.test.ts`

- [ ] Write failing tests that sequential saves write only one fixed round slot
  plus bounded metadata, retain the latest display records, overwrite circular
  slots after 2,000 rounds, and recover safely from malformed metadata.
- [ ] Implement schema-v2 metadata and round-slot persistence.
- [ ] Ensure settings-only saves do not rewrite round slots.
- [ ] Verify storage tests pass.

### Task 6: Documentation and verification

**Files:**
- Modify: `README.md`

- [ ] Document incremental shared statistics, schema-v2 circular persistence,
  normal-round `O(N)` time, and unchanged fixed `eta`/manual `alpha`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
