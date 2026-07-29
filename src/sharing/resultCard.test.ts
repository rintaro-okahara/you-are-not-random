import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChallengeResult } from "../challenge/challenge";
import {
  copyResultText,
  createResultPng,
  createShareText,
  downloadResult,
  shareResult,
} from "./resultCard";

const result: ChallengeResult = {
  completedAt: 123,
  aiWins: 21,
  humanWins: 18,
  draws: 11,
  expertId: "repeat-last",
  expertName: "Repeat Last",
  suspicionText: "直前と同じ手をもう一度出す傾向を疑っています",
  support: 0.4,
};

function installCanvas() {
  const context = {
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 28 })),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["png"], { type: "image/png" })),
  );
  return context;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("result sharing", () => {
  it("creates an honest, non-diagnostic share message", () => {
    const text = createShareText(result, "https://example.test/");
    expect(text).toContain(
      "AIに「直前と同じ手をもう一度出す傾向」を疑われました",
    );
    expect(text).toContain("あなた 18勝 / AI 21勝 / 11分");
    expect(text).toContain("#勝利不能じゃんけんAI");
    expect(text).not.toContain("あなたはRepeat Last型です");
  });

  it("renders a 1200 by 630 PNG", async () => {
    installCanvas();
    const blob = await createResultPng(result);
    expect(blob.type).toBe("image/png");
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
  });

  it("shares a PNG file when file sharing is supported", async () => {
    installCanvas();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperties(navigator, {
      share: { configurable: true, value: share },
      canShare: {
        configurable: true,
        value: vi.fn(() => true),
      },
    });

    await shareResult(result, "https://example.test/");
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        files: [expect.any(File)],
        text: expect.stringContaining("疑われました"),
      }),
    );
  });

  it("copies the generated post text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await copyResultText(result, "https://example.test/");
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("https://example.test/"),
    );
  });

  it("downloads a generated PNG", async () => {
    installCanvas();
    const createObjectURL = vi.fn(() => "blob:result");
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    await downloadResult(result);
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:result");
  });
});
