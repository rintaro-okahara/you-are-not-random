import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EXPERTS } from "../learning/experts";
import { CurrentSuspicion } from "./CurrentSuspicion";

const weights = EXPERTS.map((_, index) =>
  index === 6 ? 0.4 : 0.6 / (EXPERTS.length - 1),
);

describe("CurrentSuspicion", () => {
  it("waits through round 7 and labels round 8 as Hedge support", () => {
    const { rerender } = render(
      <CurrentSuspicion weights={weights} roundCount={7} />,
    );
    expect(
      screen.getByText("まだ明確な癖は見つかっていません"),
    ).toBeVisible();

    rerender(<CurrentSuspicion weights={weights} roundCount={8} />);
    expect(
      screen.getByText(`「${EXPERTS[6]?.suspicionText}」`),
    ).toBeVisible();
    expect(screen.getByText("現在の支持度")).toBeVisible();
    expect(screen.getByText("Hedge weight")).toBeVisible();
  });
});
