import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChallengeResult as ChallengeResultData } from "../challenge/challenge";

const sharing = vi.hoisted(() => ({
  createXShareUrl: vi.fn(
    () => "https://x.com/intent/post?text=human-victory",
  ),
  shareResult: vi.fn().mockResolvedValue(undefined),
  downloadResult: vi.fn().mockResolvedValue(undefined),
  copyResultText: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../sharing/resultCard", () => sharing);

import { ChallengeResult } from "./ChallengeResult";

const result: ChallengeResultData = {
  completedAt: 123,
  aiWins: 21,
  humanWins: 18,
  draws: 11,
  expertId: "repeat-last",
  expertName: "Repeat Last",
  suspicionText: "直前と同じ手をもう一度出す傾向を疑っています",
  support: 0.4,
};

const humanVictory: ChallengeResultData = {
  ...result,
  aiWins: 19,
  humanWins: 26,
  draws: 5,
};

describe("ChallengeResult", () => {
  it("turns a human win into the full victory result", () => {
    render(
      <ChallengeResult
        result={humanVictory}
        celebrate
        onContinue={() => undefined}
        onRetry={() => undefined}
        onOpenLab={() => undefined}
      />,
    );

    const region = screen.getByRole("region", { name: "HUMAN VICTORY" });
    expect(region).toHaveClass("result-human-victory");
    expect(
      screen.getByRole("heading", { name: "HUMAN VICTORY" }),
    ).toHaveFocus();
    expect(screen.getByText("勝利不能、ではなかった。")).toBeVisible();
    expect(
      screen.getByText("VICTORY", { selector: ".victory-stamp" }),
    ).toBeVisible();
  });

  it.each([
    ["AI victory", result],
    [
      "draw",
      {
        ...result,
        aiWins: 22,
        humanWins: 22,
        draws: 6,
      },
    ],
  ])("keeps the standard analysis result for %s", (_, standardResult) => {
    render(
      <ChallengeResult
        result={standardResult}
        onContinue={() => undefined}
        onRetry={() => undefined}
        onOpenLab={() => undefined}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "分析完了" }),
    ).toHaveFocus();
    expect(screen.queryByText("VICTORY")).toBeNull();
  });

  it("exposes a safe direct X link before the other share actions", () => {
    render(
      <ChallengeResult
        result={humanVictory}
        onContinue={() => undefined}
        onRetry={() => undefined}
        onOpenLab={() => undefined}
      />,
    );

    const link = screen.getByRole("link", { name: /Xでシェア/ });
    expect(link).toHaveAttribute(
      "href",
      "https://x.com/intent/post?text=human-victory",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(
      screen.getByRole("button", { name: "画像付きでシェア" }),
    ).toBeVisible();
  });

  it("focuses the completed diagnosis and exposes every next step", () => {
    render(
      <ChallengeResult
        result={result}
        onContinue={() => undefined}
        onRetry={() => undefined}
        onOpenLab={() => undefined}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "分析完了" }),
    ).toHaveFocus();
    expect(screen.getByText("あなた 18勝")).toBeVisible();
    expect(screen.getByText("AI 21勝")).toBeVisible();
    expect(screen.getByText("11分")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "じゃんけんを続ける" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "LABで詳しい分析を見る" }),
    ).toBeVisible();
  });

  it("runs sharing actions and announces success", async () => {
    const user = userEvent.setup();
    render(
      <ChallengeResult
        result={result}
        onContinue={() => undefined}
        onRetry={() => undefined}
        onOpenLab={() => undefined}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "画像付きでシェア" }),
    );
    expect(sharing.shareResult).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "共有メニューを開きました",
    );

    await user.click(
      screen.getByRole("button", { name: "結果画像を保存" }),
    );
    expect(sharing.downloadResult).toHaveBeenCalledWith(result);

    await user.click(
      screen.getByRole("button", { name: "投稿文をコピー" }),
    );
    expect(sharing.copyResultText).toHaveBeenCalled();
  });

  it("confirms before starting a new challenge", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <ChallengeResult
        result={result}
        onContinue={() => undefined}
        onRetry={onRetry}
        onOpenLab={() => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "もう一度挑戦する" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
