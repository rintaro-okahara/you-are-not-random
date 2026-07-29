# You Are Not Random — Design

## Goal

Build a client-only rock-paper-scissors research demo in which a Fixed Share
mixture of human-play predictors learns online, without revealing the current
round's AI distribution before the player commits to a hand.

## Chosen approach

Use a functional core with a thin React shell.

- Domain modules own hands, payoffs, probabilities, experts, Hedge / Fixed
  Share, regret, transitions, and aggregate statistics.
- A game engine owns the exact round protocol. It prepares and samples a
  private pending round from history, consumes it when the human plays, scores
  every expert with full information, updates weights, records the result, and
  prepares the next private round.
- A reducer owns serializable application state. The pending AI hand and
  distribution may exist in state but are never rendered until the associated
  round record is complete.
- Storage validates the schema boundary and safely falls back to defaults.
- React components receive derived view models and do not implement learning
  equations.

This is preferred over putting the round protocol in components because it
keeps the information boundary testable. It is also preferred over a class
hierarchy because the learning operations are naturally small pure functions.

## Architecture and responsibilities

### Domain and learning

`src/domain/rps.ts` is the single source of truth for hand order, hand/index
conversion, the payoff matrix, round outcomes, counters, and reward vectors.
`src/domain/probability.ts` validates and normalizes probability vectors.
`src/domain/types.ts` contains shared immutable types.

`src/learning/experts.ts` exports exactly one stable list of 24 experts.
Reusable counting, smoothing, condition, cycle, streak, period, and Markov
helpers live in `expertHelpers.ts`. Every expert returns a finite normalized
vector even for empty history.

`prediction.ts` converts a human prediction to an AI action distribution with
stable softmax, beta 5, and epsilon 0.05. `hedge.ts` mixes expert action
distributions and performs normalized Fixed Share updates with eta 0.25 and
configurable alpha. `regret.ts` derives empirical best-fixed-expert regret from
recorded per-round pre-update weights and expert rewards.

### Round engine and privacy

`prepareRound` uses only completed history and current pre-round weights. When
learning is disabled it uses a uniform distribution while retaining the frozen
expert weights. Sampling accepts an injected random source and defaults to a
`crypto.getRandomValues` implementation.

`playRound` consumes the already-sampled pending round. It computes the
full-information reward vector, scores every expert distribution, applies
Fixed Share only when learning is enabled, appends a capped record, and returns
the next pending round. The completed record contains the distribution that was
actually used; the next pending distribution remains private.

### State, persistence, and recovery

The reducer supports playing, toggling learning, changing alpha, and resetting.
Initialization loads `you-are-not-random:v1`, validates schema version and all
critical fields, caps history at 2,000 rounds, and otherwise returns defaults.
Persistence stores only serializable settings, weights, and history. A reset
restores alpha, learning mode, weights, history, and storage to defaults.

### UI

The single-page dashboard has:

- a compact research-demo header;
- a large three-button play surface and post-play reveal;
- score cards and current suspicion;
- ranked expert bars and empirical regret;
- a Laplace-smoothed 3×3 transition table;
- recent history;
- learning and Fixed Share settings.

The visual system uses near-black navy surfaces, cyan and amber accents,
high-contrast type, tabular numbers, subtle grid texture, and restrained
motion. Cards collapse to one column on phones. Hand controls remain at least
48 px high, keep visible focus rings, include Japanese text labels, and do not
use color as the only result signal.

Before the first play, no numeric text or accessible label for the private
current AI distribution is rendered. After a play, only the completed round's
distribution appears.

## Error handling

Probability helpers repair non-finite, negative, or zero-sum inputs to a
uniform vector. Fixed Share normalizes both posterior and shared weights.
Storage treats malformed JSON, unknown schemas, invalid hand values, or
incompatible expert vector lengths as a cache miss. UI derivations use
zero-round defaults and never display `NaN`.

## Testing

Vitest covers all nine payoffs, reward vectors, stable probabilities, 24 expert
validity and representative expert behavior, Markov backoff, Hedge / Fixed
Share invariants, regret arithmetic, sampling injection, game privacy, learning
off, storage recovery, transitions, and aggregate statistics.

React Testing Library verifies the hidden-before-play / revealed-after-play
boundary, the learning-off notice, controls, result rendering, and reset.
ESLint, the full Vitest suite, TypeScript compilation through Vite, and a
production build are required. The built application will also be opened at
desktop and mobile widths for a final visual check.

## Scope

There is no backend, authentication, telemetry, remote data, AI API, chart
library, state library, or multiplayer mode. The application makes no claim
that humans are inherently predictable; it visualizes how this specified
online learner reacts to observed play.
