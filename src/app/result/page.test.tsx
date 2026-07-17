import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ResultPage from "./page";
import type { RoastResult } from "@/lib/domain/roast";
import { AI_ROAST_STORAGE_KEY, saveLatestRoast } from "@/lib/domain/storage";

const result: RoastResult = {
  opening: "各位观众，今晚这位把随意活成了严谨。",
  observations: [
    { title: "第一眼", body: "你不是没准备，是准备得不想让人看出来。", tag: "松弛" },
    { title: "小细节", body: "每一个选择都精准避开了标准答案。", tag: "精准" },
    { title: "最终判定", body: "看似临场发挥，其实临场也没发挥。", tag: "稳定" },
  ],
  bestJoke: "你的松弛感，是紧张看了都想辞职。",
  reverseCompliment: "不过能把自己活得这么坦然，确实很难得。",
  comedyTags: ["松弛", "稳定", "自然"],
  metrics: { atmosphere: 88, stubbornness: 72, casualCredibility: 91 },
  award: { title: "年度松弛感大奖", citation: "表彰你始终忠于自己的节奏。" },
  safetyMode: "standard",
};

function mockMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockMotion(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("result page recovery", () => {
  it("shows the long-stare message once per session after 12 visible seconds and allows dismissal", async () => {
    saveLatestRoast(result);
    vi.useFakeTimers();
    render(<ResultPage />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(12_000));
    expect(screen.getByRole("status", { name: "停留彩蛋" })).toHaveTextContent("你已经盯着这句吐槽看了12秒。看来击中得比预计更深。");
    act(() => screen.getByRole("button", { name: "关闭停留提示" }).click());
    expect(screen.queryByRole("status", { name: "停留彩蛋" })).not.toBeInTheDocument();
    cleanup();
    render(<ResultPage />);
    await act(async () => vi.advanceTimersByTime(12_000));
    expect(screen.queryByRole("status", { name: "停留彩蛋" })).not.toBeInTheDocument();
  });

  it("pauses the long-stare timer while the document is hidden", async () => {
    saveLatestRoast(result);
    vi.useFakeTimers();
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    render(<ResultPage />);
    await act(async () => {});
    await act(async () => vi.advanceTimersByTime(6_000));
    act(() => { visibility = "hidden"; document.dispatchEvent(new Event("visibilitychange")); });
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(screen.queryByRole("status", { name: "停留彩蛋" })).not.toBeInTheDocument();
    act(() => { visibility = "visible"; document.dispatchEvent(new Event("visibilitychange")); });
    await act(async () => vi.advanceTimersByTime(6_000));
    expect(screen.getByRole("status", { name: "停留彩蛋" })).toBeInTheDocument();
  });
  it("renders the exact opening, observations, best joke and warm closing", async () => {
    saveLatestRoast(result);
    render(<ResultPage />);

    expect(await screen.findByText(result.opening)).toBeInTheDocument();
    for (const observation of result.observations) {
      expect(screen.getByText(observation.title)).toBeInTheDocument();
      expect(screen.getByText(observation.body)).toBeInTheDocument();
      expect(screen.getByText(observation.tag)).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "这条内容最该挨的一句" })).toBeInTheDocument();
    expect(screen.getByText(result.bestJoke)).toBeInTheDocument();
    expect(screen.getAllByText(result.reverseCompliment)).toHaveLength(2);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the themed empty state when no result exists", async () => {
    render(<ResultPage />);

    expect(await screen.findByRole("heading", { name: "还没有可锐评的内容" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去交出素材" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it.each([
    ["expired", JSON.stringify({ version: 1, savedAt: 1, data: result })],
    ["invalid", "{definitely-not-json"],
  ])("ignores and removes %s storage", async (_label, stored) => {
    vi.spyOn(Date, "now").mockReturnValue(24 * 60 * 60 * 1000 + 2);
    localStorage.setItem(AI_ROAST_STORAGE_KEY, stored);
    render(<ResultPage />);

    expect(await screen.findByText("还没有可锐评的内容")).toBeInTheDocument();
    expect(localStorage.getItem(AI_ROAST_STORAGE_KEY)).toBeNull();
  });

  it("reveals acts sequentially and keeps already revealed content", async () => {
    mockMotion(false);
    saveLatestRoast(result);
    vi.useFakeTimers();
    render(<ResultPage />);

    await act(async () => {});
    expect(screen.getAllByText(result.opening)).toHaveLength(2);
    expect(screen.queryByText(result.observations[0].body)).not.toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(700));
    expect(screen.getByText(result.observations[0].body, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(result.opening, { selector: "blockquote" })).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(700 * 4));
    expect(screen.getByText(result.bestJoke)).toBeInTheDocument();
    expect(screen.getByText(result.reverseCompliment, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "现场播报" })).toHaveTextContent(result.reverseCompliment);
  });

  it("cancels reveal timers on unmount", async () => {
    mockMotion(false);
    saveLatestRoast(result);
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = render(<ResultPage />);
    await act(async () => {});

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("never hides completed acts when delayed timers fire after returning to the tab", async () => {
    mockMotion(false);
    saveLatestRoast(result);
    vi.useFakeTimers();
    let visibility: DocumentVisibilityState = "hidden";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    render(<ResultPage />);
    await act(async () => {});

    act(() => {
      visibility = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText(result.reverseCompliment, { selector: "p" })).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(700));
    expect(screen.getByText(result.reverseCompliment, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(result.bestJoke)).toBeInTheDocument();
  });

  it("provides share, archive and retry destinations without the legacy battle flow", async () => {
    saveLatestRoast(result);
    render(<ResultPage />);
    await screen.findByText(result.opening);

    expect(screen.getAllByRole("link", { name: "生成分享卡" }).at(-1)).toHaveAttribute("href", "/report?share=1");
    expect(screen.getByRole("link", { name: "查看锐评档案" })).toHaveAttribute("href", "/report");
    expect(screen.getByRole("link", { name: "再锐评一条" })).toHaveAttribute("href", "/roast");
    expect(screen.queryByRole("link", { name: /不服|反击|复仇/ })).not.toBeInTheDocument();
  });
});
