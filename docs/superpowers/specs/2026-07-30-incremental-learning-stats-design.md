# Incremental Learning Statistics — Design

## Problem

The current expert interface receives the complete round history. Frequency,
decay, streak, and Markov experts rescan that history for every prediction.
Dashboard statistics and regret rescan it again, and persistence serializes the
whole history after every state change. The visible behavior is correct, but
round cost grows with elapsed history.

## Design

Introduce one immutable `LearningStats` value shared by all experts. It keeps
global counts, rolling counts for 5/10/20 hands, exponentially decayed counts,
bounded order-1/2/3 Markov tables, the last 20 hands, streak information, last
round information, outcome totals, and the last 10 outcomes. A completed round
updates this value once in constant time because the hand alphabet, context
depth, and rolling windows are fixed.

Experts accept `LearningStats`, never history. Their predictions must remain
numerically identical to the existing implementation for any history.

Maintain a `RegretStats` accumulator containing per-expert cumulative reward,
algorithm expected reward, and learning-round count. Each round updates it in
`O(N)` and the UI summarizes it in `O(N)`.

React retains only the latest 15 records needed by the history panel. Total
round count, match statistics, transitions, and regret come from aggregate
state.

Replace the monolithic localStorage payload with schema v2:

- one constant-size metadata record containing settings, weights, learning
  aggregates, regret aggregates, sequence information, and the latest ID;
- 2,000 fixed round slots used as a circular buffer.

Saving a new round serializes one `RoundRecord` (`O(N)`) and metadata
(`O(N)`), while settings-only changes update metadata only. Loading reads the
latest 15 slots for display. Reset removes metadata and all fixed slots.
Malformed or v1 data safely falls back to defaults.

## Complexity

With 24 experts and fixed `K=3`, a normal round performs:

- one constant-time aggregate update;
- 24 constant-time expert predictions;
- `O(N)` mixing, scoring, Fixed Share, and regret update;
- one constant-size recent-history append;
- one `O(N)` round-slot and metadata persistence update.

Therefore elapsed history length does not appear in the normal round path.
Adaptive learning rate and adaptive share rate remain out of scope.
