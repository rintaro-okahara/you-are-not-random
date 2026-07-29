import { HAND_LABELS } from "../domain/rps";
import type { Hand, Reward } from "../domain/types";

const percentFormatter = new Intl.NumberFormat("ja-JP", {
  style: "percent",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 3,
  signDisplay: "exceptZero",
});

export function formatPercent(value: number): string {
  return percentFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

export function handLabel(hand: Hand): string {
  return HAND_LABELS[hand];
}

export function resultLabel(reward: Reward): string {
  return reward === 1
    ? "AIの勝ち"
    : reward === -1
      ? "あなたの勝ち"
      : "引き分け";
}
