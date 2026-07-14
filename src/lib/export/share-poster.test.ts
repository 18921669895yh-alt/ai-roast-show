import { afterEach, expect, it, vi } from "vitest";
import { exportSharePoster } from "./share-poster";

afterEach(() => vi.restoreAllMocks());

it("waits for fonts, renders a fixed clean clone, downloads, and cleans up", async () => {
  const source = document.createElement("article");
  source.textContent = "AI吐槽大会";
  document.body.append(source);
  let fontsResolved = false;
  const ready = Promise.resolve().then(() => { fontsResolved = true; });
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
  const toPng = vi.fn(async (node: HTMLElement, options: object) => {
    expect(fontsResolved).toBe(true);
    expect(node).not.toBe(source);
    expect(node.parentElement).toBe(document.body);
    expect(node).toHaveClass("share-poster-export-surface");
    expect(options).toEqual(expect.objectContaining({ pixelRatio: 2, cacheBust: true, width: 900, height: 1600 }));
    return "data:image/png;base64,AAAA";
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  await exportSharePoster(source, { toPng });

  expect(click).toHaveBeenCalledOnce();
  const anchor = click.mock.instances[0];
  expect(anchor.download).toBe("AI吐槽大会-完整票根.png");
  expect(anchor.href).toContain("data:image/png");
  expect(anchor.isConnected).toBe(false);
  expect(document.querySelector(".share-poster-export-surface")).toBeNull();
  source.remove();
});

it("cleans temporary nodes when conversion fails", async () => {
  const source = document.createElement("div");
  document.body.append(source);
  await expect(exportSharePoster(source, { toPng: vi.fn().mockRejectedValue(new Error("fail")) })).rejects.toThrow();
  expect(document.querySelector(".share-poster-export-surface")).toBeNull();
  expect(document.querySelector("a[download='AI吐槽大会-分享卡.png']")).toBeNull();
  source.remove();
});
