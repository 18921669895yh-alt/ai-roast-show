import { toPng as htmlToPng } from "html-to-image";

type ToPng = (node: HTMLElement, options?: Parameters<typeof htmlToPng>[1]) => Promise<string>;

export async function exportSharePoster(node: HTMLElement, dependencies: { toPng?: ToPng } = {}): Promise<void> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1600;
  const context = canvas.getContext("2d");
  if (context) {
    const text = (selector: string) => node.querySelector(selector)?.textContent?.trim() ?? "";
    const wrap = (value: string, max: number) => {
      const chars = Array.from(value);
      const lines: string[] = [];
      for (let i = 0; i < chars.length; i += max) lines.push(chars.slice(i, i + max).join(""));
      return lines.slice(0, 6);
    };
    const score = text(".poster-score strong") || "0";
    context.fillStyle = "#f7e6b8"; context.fillRect(0, 0, 900, 1600);
    context.fillStyle = "#8e251d"; context.fillRect(0, 0, 900, 180);
    context.fillStyle = "#f0cf68"; context.fillRect(0, 1380, 900, 220);
    context.strokeStyle = "#10090f"; context.lineWidth = 6; context.strokeRect(3, 3, 894, 1594);
    context.fillStyle = "#10090f";
    for (let y = 220; y < 1380; y += 34) {
      context.beginPath(); context.arc(0, y, 9, -Math.PI / 2, Math.PI / 2); context.fill();
      context.beginPath(); context.arc(900, y, 9, Math.PI / 2, (Math.PI * 3) / 2); context.fill();
    }
    for (let x = 28; x < 872; x += 34) {
      context.beginPath(); context.arc(x, 0, 9, 0, Math.PI); context.fill();
      context.beginPath(); context.arc(x, 1600, 9, Math.PI, Math.PI * 2); context.fill();
    }
    context.setLineDash([10, 10]); context.beginPath(); context.moveTo(0, 180); context.lineTo(900, 180); context.moveTo(0, 1380); context.lineTo(900, 1380); context.stroke(); context.setLineDash([]);
    context.fillStyle = "#fff4d7"; context.textAlign = "center"; context.font = "900 62px Arial"; context.fillText("AI吐槽大会", 450, 90);
    context.font = "900 22px Arial"; context.fillText("ROAST TICKET · COMEDY ARCHIVE · 2026", 450, 135);
    context.textAlign = "left"; context.fillStyle = "#10090f"; context.font = "900 42px Arial"; context.fillText("朋友圈锐评档案", 80, 260);
    context.font = "900 24px Arial"; context.fillText(`NO. ${score}`, 650, 260);
    context.strokeStyle = "#10090f"; context.lineWidth = 3; context.beginPath(); context.moveTo(80, 290); context.lineTo(820, 290); context.stroke();
    context.fillStyle = "#8e251d"; context.font = "900 26px Arial"; context.fillText("本场观察", 80, 360);
    context.fillStyle = "#10090f"; context.font = "700 30px Arial";
    wrap(text(".poster-feature p"), 24).forEach((line, index) => context.fillText(line, 80, 415 + index * 42));
    context.fillStyle = "#8e251d"; context.font = "900 44px Arial"; context.fillText("“", 80, 700);
    context.fillStyle = "#10090f"; context.font = "900 36px Arial";
    wrap(text("blockquote"), 20).forEach((line, index) => context.fillText(line, 125, 700 + index * 48));
    context.fillStyle = "#8e251d"; context.font = "900 26px Arial"; context.fillText("喜剧标签", 80, 970);
    context.fillStyle = "#10090f"; context.font = "700 25px Arial"; context.fillText(text(".poster-tags") || "现场观察 · 细节雷达 · 轻松调侃", 80, 1025);
    context.font = "900 28px Arial"; context.fillText("嘴硬指数", 80, 1160);
    context.font = "900 110px Arial"; context.fillText(score, 80, 1290); context.font = "700 28px Arial"; context.fillText("/ 100", 300, 1290);
    context.fillStyle = "#8e251d"; context.fillRect(80, 1330, 740, 18); context.fillStyle = "#10090f"; context.fillRect(80, 1330, Math.min(740, Number(score) * 7.4 || 0), 18);
    context.fillStyle = "#10090f"; context.textAlign = "center"; context.font = "900 30px Arial"; context.fillText("保存这张票根，下次继续开麦", 450, 1490); context.font = "700 22px Arial"; context.fillText("AI ROAST SHOW · KEEP THE RECEIPT", 450, 1535);
    const dataUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a"); anchor.download = "AI吐槽大会-完整票根.png"; anchor.href = dataUrl; anchor.rel = "noopener"; document.body.append(anchor); anchor.click(); anchor.remove();
    return;
  }

  const clone = node.cloneNode(true) as HTMLElement;
  clone.classList.add("share-poster-export-surface");
  Object.assign(clone.style, { position: "fixed", left: "-12000px", top: "0", width: "900px", height: "1600px", maxWidth: "none", transform: "none", margin: "0", zIndex: "9999", opacity: "1" });
  document.body.append(clone);
  let anchor: HTMLAnchorElement | null = null;
  try {
    const dataUrl = await (dependencies.toPng ?? htmlToPng)(clone, { pixelRatio: 2, cacheBust: true, width: 900, height: 1600, backgroundColor: "#f5e8c8", style: { width: "900px", height: "1600px", transform: "none" } });
    anchor = document.createElement("a"); anchor.download = "AI吐槽大会-完整票根.png"; anchor.href = dataUrl; anchor.rel = "noopener"; document.body.append(anchor); anchor.click();
  } finally { anchor?.remove(); clone.remove(); }
}
