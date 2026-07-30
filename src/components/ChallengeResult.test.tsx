import { render, screen, waitFor } from "@testing-library/react";
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
    expect(
      screen.getByText(
        "勝利不能、ではなかった。50戦でAIに勝ち越しました。",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("VICTORY", { selector: ".victory-stamp" }),
    ).toBeVisible();
  });

  it.each([
    ["AI victory", result, "AIが勝ち越し"],
    [
      "draw",
      {
        ...result,
        aiWins: 22,
        humanWins: 22,
        draws: 6,
      },
      "引き分け",
    ],
  ])(
    "uses an outcome-specific analysis heading for %s",
    (_, standardResult, heading) => {
      render(
        <ChallengeResult
          result={standardResult}
          onContinue={() => undefined}
          onRetry={() => undefined}
          onOpenLab={() => undefined}
        />,
      );

      expect(screen.getByRole("heading", { name: heading })).toHaveFocus();
      expect(screen.queryByText("VICTORY")).toBeNull();
    },
  );

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
      screen.getByRole("heading", { name: "AIが勝ち越し" }),
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

  it("only disables the asynchronous share action currently in flight", async () => {
    const user = userEvent.setup();
    let finishShare: (() => void) | undefined;
    sharing.shareResult.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishShare = resolve;
      }),
    );
    render(
      <ChallengeResult
        result={result}
        onContinue={() => undefined}
        onRetry={() => undefined}
        onOpenLab={() => undefined}
      />,
    );

    const shareButton = screen.getByRole("button", {
      name: "画像付きでシェア",
    });
    const downloadButton = screen.getByRole("button", {
      name: "結果画像を保存",
    });
    const copyButton = screen.getByRole("button", {
      name: "投稿文をコピー",
    });

    await user.click(shareButton);

    expect(shareButton).toBeDisabled();
    expect(downloadButton).toBeEnabled();
    expect(copyButton).toBeEnabled();

    finishShare?.();
    await waitFor(() => expect(shareButton).toBeEnabled());
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
