import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GamePanel } from "./GamePanel";

describe("GamePanel", () => {
  it("disables every hand while a challenge result is open", () => {
    render(
      <GamePanel
        lastRound={undefined}
        learningEnabled
        disabled
        onPlay={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "グーを出す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "パーを出す" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "チョキを出す" }),
    ).toBeDisabled();
  });
});
