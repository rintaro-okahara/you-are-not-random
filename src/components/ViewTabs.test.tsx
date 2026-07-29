import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ViewTabs } from "./ViewTabs";

describe("ViewTabs", () => {
  it("changes views by click and keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewTabs value="play" onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "LAB" }));
    expect(onChange).toHaveBeenCalledWith("lab");

    const play = screen.getByRole("tab", { name: "PLAY" });
    play.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "LAB" })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("lab");
  });

  it("exposes the controlled selection and panel relationships", () => {
    render(<ViewTabs value="lab" onChange={() => undefined} />);

    expect(screen.getByRole("tab", { name: "PLAY" })).toHaveAttribute(
      "aria-controls",
      "play-panel",
    );
    expect(screen.getByRole("tab", { name: "LAB" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
