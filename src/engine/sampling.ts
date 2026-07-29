import { HANDS } from "../domain/rps";
import type { Hand, ProbabilityVector } from "../domain/types";

export type RandomSource = () => number;

const UINT32_RANGE = 2 ** 32;

export function secureRandom(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return (value[0] ?? 0) / UINT32_RANGE;
  }
  return Math.random();
}

export function sampleHand(
  distribution: ProbabilityVector,
  random: RandomSource = secureRandom,
): Hand {
  const raw = random();
  const value = Number.isFinite(raw)
    ? Math.min(1 - Number.EPSILON, Math.max(0, raw))
    : 0;
  const rockBoundary = distribution[0];
  const paperBoundary = rockBoundary + distribution[1];

  if (value < rockBoundary) {
    return HANDS[0];
  }
  if (value < paperBoundary) {
    return HANDS[1];
  }
  return HANDS[2];
}
