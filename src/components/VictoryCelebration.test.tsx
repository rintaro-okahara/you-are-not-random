import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VictoryCelebration } from "./VictoryCelebration";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("VictoryCelebration", () => {
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
    expect(screen.getByText("19")).toBeVisible();
    expect(screen.getByText("5")).toBeVisible();
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

  it("shows final values without confetti when reduced motion is preferred", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(
      <VictoryCelebration
        active
        humanWins={26}
        aiWins={19}
        draws={5}
      />,
    );

    expect(screen.getByText("26")).toBeVisible();
    expect(screen.queryByTestId("victory-confetti")).toBeNull();
  });
});
