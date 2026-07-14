import { toPng as htmlToPng } from "html-to-image";

type ToPng = (node: HTMLElement, options?: Parameters<typeof htmlToPng>[1]) => Promise<string>;

export async function exportSharePoster(node: HTMLElement, dependencies: { toPng?: ToPng } = {}): Promise<void> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 560;
  const context = canvas.getContext("2d");
  if (context) {
    const text = (selector: string) => node.querySelector(selector)?.textContent?.trim() ?? "";
    const wrap = (value: string, max: number) => {
      const words = Array.from(value);
      const lines: string[] = [];
      for (let i = 0; i < words.length; i += max) lines.push(words.slice(i, i + max).join(""));
      return lines.slice(0, 4);
    };
    context.fillStyle = "#f7e6b8"; context.fillRect(0, 0, 1600, 560);
    context.fillStyle = "#8e251d"; context.fillRect(0, 0, 290, 560);
    context.fillStyle = "#f0cf68"; context.fillRect(1310, 0, 290, 560);
    context.strokeStyle = "#10090f"; context.lineWidth = 6; context.strokeRect(3, 3, 1594, 554);
    context.setLineDash([10, 10]); context.beginPath(); context.moveTo(290, 0); context.lineTo(290, 560); context.moveTo(1310, 0); context.lineTo(1310, 560); context.stroke(); context.setLineDash([]);
    context.fillStyle = "#fff4d7"; context.textAlign = "center"; context.font = "900 54px Arial"; context.fillText("AI", 145, 120);
    context.font = "900 22px Arial"; context.fillText("ROAST TICKET", 145, 170); context.font = "900 32px Arial"; context.fillText("AI吐槽大会", 145, 390);
    context.font = "900 20px Arial"; context.fillText(`NO. ${text(".poster-score strong") || "000"}`, 145, 445);
    context.textAlign = "left"; context.fillStyle = "#10090f"; context.font = "900 34px Arial"; context.fillText("现场吐槽报告", 360, 70);
    context.font = "900 20px Arial"; context.fillText("COMEDY ARCHIVE · 2026", 980, 70);
    context.strokeStyle = "#10090f"; context.lineWidth = 3; context.beginPath(); context.moveTo(360, 95); context.lineTo(1260, 95); context.stroke();
    context.fillStyle = "#8e251d"; context.font = "900 22px Arial"; context.fillText("本场观察", 360, 145);
    context.fillStyle = "#10090f"; context.font = "700 27px Arial";
    wrap(text(".poster-feature p"), 30).forEach((line, index) => context.fillText(line, 360, 190 + index * 36));
    context.fillStyle = "#8e251d"; context.font = "900 32px Arial"; context.fillText("“", 360, 360);
    context.fillStyle = "#10090f"; context.font = "900 34px Arial";
    wrap(text("blockquote"), 27).forEach((line, index) => context.fillText(line, 390, 350 + index * 40));
    context.fillStyle = "#10090f"; context.font = "900 24px Arial"; context.textAlign = "center"; context.fillText("嘴硬指数", 1455, 105);
    context.font = "900 100px Arial"; context.fillText(text(".poster-score strong") || "0", 1455, 245); context.font = "700 24px Arial"; context.fillText("/ 100", 1455, 285);
    context.fillStyle = "#8e251d"; context.fillRect(1370, 330, 170, 14); context.fillStyle = "#10090f"; context.fillRect(1370, 330, Math.min(170, Number(text(".poster-score strong")) * 1.7 || 0), 14);
    context.font = "700 18px Arial"; context.fillText("保存这张票根，", 1455, 430); context.fillText("下次继续开麦", 1455, 460);
    const dataUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a"); anchor.download = "AI吐槽大会-吐槽票根.png"; anchor.href = dataUrl; anchor.rel = "noopener"; document.body.append(anchor); anchor.click(); anchor.remove();
    return;
  }
  const clone = node.cloneNode(true) as HTMLElement;
  clone.classList.add("share-poster-export-surface");
  Object.assign(clone.style, {
    position: "fixed",
    left: "-12000px",
    top: "0",
    width: "1600px",
    height: "560px",
    maxWidth: "none",
    transform: "none",
    margin: "0",
    zIndex: "9999",
    opacity: "1",
  });
  document.body.append(clone);
  let anchor: HTMLAnchorElement | null = null;
  try {
    const dataUrl = await (dependencies.toPng ?? htmlToPng)(clone, {
      pixelRatio: 2,
      cacheBust: true,
      width: 1600,
      height: 560,
      backgroundColor: "#f5e8c8",
      style: { width: "1600px", height: "560px", transform: "none" },
    });
    anchor = document.createElement("a");
    anchor.download = "AI吐槽大会-分享卡.png";
    anchor.href = dataUrl;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    clone.remove();
  }
}
