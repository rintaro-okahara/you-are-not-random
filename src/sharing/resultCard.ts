import type { ChallengeResult } from "../challenge/challenge";

const CARD_WIDTH = 1_200;
const CARD_HEIGHT = 630;
const SHARE_TITLE = "勝利不能？じゃんけんAI — YOU ARE NOT RANDOM";

function suspicionLabel(result: ChallengeResult): string {
  return result.suspicionText.replace(/を疑っています$/, "");
}

export function createShareText(
  result: ChallengeResult,
  url: string,
): string {
  return [
    "勝利不能？じゃんけんAIに50回挑戦。",
    `AIに「${suspicionLabel(result)}」を疑われました。`,
    "",
    `あなた ${result.humanWins}勝 / AI ${result.aiWins}勝 / ${result.draws}分`,
    "あなたはAIに読まれずにいられる？",
    url,
    "#勝利不能じゃんけんAI #YouAreNotRandom",
  ].join("\n");
}

function drawGrid(context: CanvasRenderingContext2D) {
  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = "#5eead4";
  context.lineWidth = 1;
  for (let x = 0; x <= CARD_WIDTH; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, CARD_HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= CARD_HEIGHT; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(CARD_WIDTH, y);
    context.stroke();
  }
  context.restore();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const characters = Array.from(text);
  const lines: string[] = [];
  let line = "";
  characters.forEach((character) => {
    const candidate = `${line}${character}`;
    if (line !== "" && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character;
    } else {
      line = candidate;
    }
  });
  if (line !== "") {
    lines.push(line);
  }
  lines.slice(0, maxLines).forEach((value, index) => {
    const isTruncated = index === maxLines - 1 && lines.length > maxLines;
    context.fillText(
      isTruncated ? `${value.slice(0, -1)}…` : value,
      x,
      y + index * lineHeight,
    );
  });
}

function drawResultCard(
  context: CanvasRenderingContext2D,
  result: ChallengeResult,
) {
  context.fillStyle = "#061011";
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawGrid(context);

  context.fillStyle = "#5eead4";
  context.fillRect(64, 58, 7, 514);
  context.fillRect(64, 58, 210, 2);

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#8ca29e";
  context.font = '500 20px "DM Mono", monospace';
  context.fillText("50 ROUND ANALYSIS / 24 HYPOTHESES", 104, 100);

  context.fillStyle = "#e8f1ee";
  context.font = '800 58px Manrope, "Noto Sans JP", sans-serif';
  context.fillText("勝利不能？じゃんけんAI", 100, 174);

  context.fillStyle = "#5eead4";
  context.font = '500 24px "DM Mono", monospace';
  context.fillText("YOU ARE NOT RANDOM", 104, 217);

  context.fillStyle = "#8ca29e";
  context.font = '500 18px Manrope, "Noto Sans JP", sans-serif';
  context.fillText("AIが最も強く疑った仮説", 104, 286);

  context.fillStyle = "#e8f1ee";
  context.font = '700 34px Manrope, "Noto Sans JP", sans-serif';
  drawWrappedText(
    context,
    `「${suspicionLabel(result)}」`,
    104,
    334,
    1_000,
    46,
    2,
  );

  context.fillStyle = "#5eead4";
  context.font = '500 20px "DM Mono", monospace';
  context.fillText(
    `${result.expertName} / SUPPORT ${(result.support * 100).toFixed(1)}%`,
    104,
    435,
  );

  context.fillStyle = "#e8f1ee";
  context.font = '700 30px "DM Mono", monospace';
  context.fillText(
    `YOU ${result.humanWins}  —  ${result.aiWins} AI  /  DRAW ${result.draws}`,
    104,
    506,
  );

  context.fillStyle = "#8ca29e";
  context.font = '500 18px Manrope, "Noto Sans JP", sans-serif';
  context.fillText("あなたはAIに読まれずにいられる？", 104, 558);
}

export function createResultPng(result: ChallengeResult): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (context === null) {
    return Promise.reject(new Error("結果画像を生成できませんでした。"));
  }
  drawResultCard(context, result);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("結果画像を生成できませんでした。"));
      } else {
        resolve(blob);
      }
    }, "image/png");
  });
}

export async function shareResult(
  result: ChallengeResult,
  url: string,
): Promise<void> {
  if (navigator.share === undefined) {
    throw new Error(
      "このブラウザでは共有メニューを利用できません。画像保存か投稿文コピーをお使いください。",
    );
  }

  const text = createShareText(result, url);
  const probeFile = new File(
    [new Blob([], { type: "image/png" })],
    "shori-funo-janken-ai.png",
    { type: "image/png" },
  );
  if (navigator.canShare?.({ files: [probeFile] }) === true) {
    const blob = await createResultPng(result);
    const file = new File([blob], "shori-funo-janken-ai.png", {
      type: "image/png",
    });
    await navigator.share({ title: SHARE_TITLE, text, files: [file] });
    return;
  }
  await navigator.share({ title: SHARE_TITLE, text, url });
}

export async function downloadResult(
  result: ChallengeResult,
): Promise<void> {
  const blob = await createResultPng(result);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = "shori-funo-janken-ai-result.png";
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function copyResultText(
  result: ChallengeResult,
  url: string,
): Promise<void> {
  if (navigator.clipboard === undefined) {
    throw new Error("このブラウザではクリップボードを利用できません。");
  }
  await navigator.clipboard.writeText(createShareText(result, url));
}
