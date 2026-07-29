import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("You Are Not Random UI", () => {
  it("introduces the game immediately and defaults to PLAY", () => {
    render(<App random={() => 0} />);
    expect(
      screen.getByRole("heading", {
        name: "勝利不能？ じゃんけんAI",
        level: 1,
      }),
    ).toBeVisible();
    expect(screen.getByText("YOU ARE NOT RANDOM")).toBeVisible();
    expect(screen.getByRole("tabpanel", { name: "PLAY" })).toBeVisible();
    expect(screen.queryByText("Empirical regret")).toBeNull();
  });

  it("moves research telemetry into LAB", async () => {
    const user = userEvent.setup();
    render(<App random={() => 0} />);
    await user.click(screen.getByRole("tab", { name: "LAB" }));
    expect(screen.getByText("Empirical regret")).toBeVisible();
    expect(screen.getByText("expert重み")).toBeVisible();
  });

  it("does not render the private current AI distribution before play", () => {
    render(<App random={() => 0} />);
    expect(screen.queryByText("このラウンドでAIが使った確率")).toBeNull();
    expect(screen.getByText("手を選ぶまでAIの手と確率は非公開です")).toBeVisible();
  });

  it("reveals only the completed round distribution after a choice", async () => {
    const user = userEvent.setup();
    render(<App random={() => 0} />);
    await user.click(screen.getByRole("button", { name: "パーを出す" }));
    expect(screen.getByText("このラウンドでAIが使った確率")).toBeVisible();
    expect(
      screen.getByRole("status", { name: "直近ラウンドの結果" }),
    ).toHaveTextContent("あなたの勝ち");
    expect(screen.getByText("AI：グー")).toBeVisible();
  });

  it("clearly announces uniform random play while learning is off", async () => {
    const user = userEvent.setup();
    render(<App random={() => 0} />);
    await user.click(screen.getByRole("tab", { name: "LAB" }));
    await user.click(
      screen.getByRole("checkbox", { name: "学習を有効にする" }),
    );
    await user.click(screen.getByRole("tab", { name: "PLAY" }));
    expect(screen.getByText("学習停止中：AIは一様ランダムです")).toBeVisible();
  });

  it("clears visible history after confirmed reset", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App random={() => 0} />);
    await user.click(screen.getByRole("button", { name: "グーを出す" }));
    await user.click(screen.getByRole("tab", { name: "LAB" }));
    expect(screen.getByText("ラウンド #1")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "すべてリセット" }));
    await user.click(screen.getByRole("tab", { name: "LAB" }));
    expect(screen.getByText("まだ対戦履歴がありません")).toBeVisible();
  });

  it("freezes the round-50 result, then continues to round 51", async () => {
    const user = userEvent.setup();
    render(<App random={() => 0} />);

    for (let round = 0; round < 50; round += 1) {
      await user.click(screen.getByRole("button", { name: "パーを出す" }));
    }

    expect(
      screen.getByRole("heading", { name: "分析完了" }),
    ).toHaveFocus();
    expect(screen.getByText("あなた 50勝")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "じゃんけんを続ける" }),
    );
    await user.click(screen.getByRole("button", { name: "パーを出す" }));
    await user.click(screen.getByRole("tab", { name: "LAB" }));
    expect(screen.getByText("全51戦 / 最新2,000件を保存")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "50戦の診断を見る" }),
    );
    expect(screen.getByText("あなた 50勝")).toBeVisible();
  });
});
