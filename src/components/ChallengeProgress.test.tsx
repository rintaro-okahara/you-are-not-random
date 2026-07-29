import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChallengeProgress } from "./ChallengeProgress";

describe("ChallengeProgress", () => {
  it("changes from analysis to a provisional hypothesis at round 8", () => {
    const { rerender } = render(<ChallengeProgress rounds={7} />);
    expect(screen.getByText("分析中")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "7");

    rerender(<ChallengeProgress rounds={8} />);
    expect(screen.getByText("暫定仮説")).toBeVisible();
  });

  it("caps the visible progress at 50 rounds", () => {
    render(<ChallengeProgress rounds={65} />);
    expect(screen.getByText("診断完了")).toBeVisible();
    expect(screen.getByText("50")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "50");
  });
});
