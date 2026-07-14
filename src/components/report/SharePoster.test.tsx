import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import SharePoster from "./SharePoster";
import type { RoastResult } from "@/lib/domain/roast";
import { ROAST_TEXT_LIMITS, roastResultSchema } from "@/lib/domain/roast";

const result: RoastResult = {
  opening: "开场", observations: [1, 2, 3].map((n) => ({ title: `观察${n}`, body: `已有观察证据${n}`, tag: `标签${n}` })),
  bestJoke: "金句", reverseCompliment: "夸奖", comedyTags: ["一", "二", "三"],
  metrics: { atmosphere: 80, stubbornness: 70, casualCredibility: 60 },
  award: { title: "奖项", citation: "颁奖词" }, safetyMode: "standard",
};

it("keeps all critical poster content as text and excludes images", () => {
  render(<SharePoster open result={result} onClose={vi.fn()} onExport={vi.fn()} />);
  const dialog = screen.getByRole("dialog", { name: "分享卡片预览" });
  expect(dialog).toHaveTextContent("AI吐槽大会");
  expect(dialog).toHaveTextContent("已有观察证据1");
  for (const tag of result.comedyTags) expect(dialog).toHaveTextContent(tag);
  expect(dialog).toHaveTextContent(result.bestJoke);
  expect(dialog).toHaveTextContent("嘴硬指数");
  expect(dialog).toHaveTextContent("ai-roast.local");
  expect(dialog.querySelector("img")).toBeNull();
  expect(screen.getByTestId("share-poster-surface")).toHaveClass("share-poster-surface");
});

it("traps focus inside the dialog", async () => {
  render(<SharePoster open result={result} onClose={vi.fn()} onExport={vi.fn()} />);
  const close = screen.getByRole("button", { name: "关闭分享卡片预览" });
  const exportButton = screen.getByRole("button", { name: "下载 PNG" });
  exportButton.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(exportButton).toHaveFocus();
});

it("keeps the modal open and exposes a safe export failure", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<SharePoster open result={result} onClose={vi.fn()} onExport={vi.fn().mockRejectedValue(new Error("raw secret"))} />);
  await userEvent.click(screen.getByRole("button", { name: "下载 PNG" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("导出失败，请重试；你仍可复制最佳金句");
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.queryByText(/raw secret/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "复制最佳金句" }));
  expect(writeText).toHaveBeenCalledWith(result.bestJoke);
  expect(screen.getByRole("status")).toHaveTextContent("最佳金句已复制");
  expect(screen.getByRole("dialog")).toBeVisible();
});

it("keeps the modal open with accessible feedback when clipboard is unavailable", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  render(<SharePoster open result={result} onClose={vi.fn()} onExport={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "复制最佳金句" }));
  expect(screen.getByRole("status")).toHaveTextContent("复制失败，请手动选择金句复制");
  expect(screen.getByRole("dialog")).toBeVisible();
});

it("prevents duplicate export and ignores completion after unmount", async () => {
  let resolve!: () => void;
  const onExport = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
  const view = render(<SharePoster open result={result} onClose={vi.fn()} onExport={onExport} />);
  const button = screen.getByRole("button", { name: "下载 PNG" });
  await userEvent.click(button);
  await userEvent.click(button);
  expect(onExport).toHaveBeenCalledTimes(1);
  view.unmount();
  resolve();
  await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
});

it("clears export busy state and reports clipboard results in StrictMode", async () => {
  let finishExport!: () => void;
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<SharePoster open result={result} onClose={vi.fn()} onExport={() => new Promise<void>((resolve) => { finishExport = resolve; })} />, { reactStrictMode: true });

  await userEvent.click(screen.getByRole("button", { name: "下载 PNG" }));
  expect(screen.getByRole("button", { name: "正在导出…" })).toBeDisabled();
  finishExport();
  expect(await screen.findByRole("button", { name: "下载 PNG" })).toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "复制最佳金句" }));
  expect(screen.getByRole("status")).toHaveTextContent("最佳金句已复制");
});

it("contains all boundary-length poster text and marks dense copy for contained sizing", () => {
  const bounded = roastResultSchema.parse({
    ...result,
    observations: result.observations.map((item, index) => index ? item : { ...item, body: "观".repeat(ROAST_TEXT_LIMITS.observationBody) }),
    bestJoke: "句".repeat(ROAST_TEXT_LIMITS.bestJoke),
    comedyTags: ["签".repeat(ROAST_TEXT_LIMITS.tag), "二", "三"],
  });
  render(<SharePoster open result={bounded} onClose={vi.fn()} onExport={vi.fn()} />);
  const surface = screen.getByTestId("share-poster-surface");
  expect(surface).toHaveClass("is-copy-dense");
  expect(surface).toHaveTextContent(bounded.observations[0].body);
  expect(surface).toHaveTextContent(bounded.bestJoke);
  expect(surface).toHaveTextContent(bounded.comedyTags[0]);
});

it("reports a rejected clipboard promise without closing in StrictMode", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  render(<SharePoster open result={result} onClose={vi.fn()} onExport={vi.fn()} />, { reactStrictMode: true });
  await userEvent.click(screen.getByRole("button", { name: "复制最佳金句" }));
  expect(screen.getByRole("status")).toHaveTextContent("复制失败，请手动选择金句复制");
  expect(screen.getByRole("dialog")).toBeVisible();
});
