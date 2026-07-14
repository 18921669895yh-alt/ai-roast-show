import { toPng as htmlToPng } from "html-to-image";

type ToPng = (node: HTMLElement, options?: Parameters<typeof htmlToPng>[1]) => Promise<string>;

export async function exportSharePoster(node: HTMLElement, dependencies: { toPng?: ToPng } = {}): Promise<void> {
  await document.fonts?.ready;
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
