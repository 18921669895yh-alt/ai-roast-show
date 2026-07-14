import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ReportPage from "./page";
import type { RoastResult } from "@/lib/domain/roast";
import { saveLatestRoast } from "@/lib/domain/storage";

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

const refined = {
  comedyTags: ["气氛担当", "细节雷达", "压轴选手"],
  metrics: { atmosphere: 90, stubbornness: 73, casualCredibility: 42 },
  award: { title: "年度精准收尾奖", citation: "颁给总能在最后一秒给出重点的你。" },
  bestJoke: "你的随便不是没有答案，是答案还在候场。",
  fictionalDisclaimer: "以下数据均为喜剧化虚构，不是真实心理测量。",
};

function okResponse(data = refined, degraded = false) {
  return Promise.resolve(new Response(JSON.stringify({ data, meta: { provider: degraded ? "mock" : "kimi", degraded } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));
}

beforeEach(() => {
  localStorage.clear();
  history.replaceState({}, "", "/report");
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => okResponse()));
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

afterEach(() => {
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("report page", () => {
  it("shows an accessible empty state with the roast CTA", async () => {
    render(<ReportPage />);
    expect(await screen.findByRole("heading", { name: "还没有可打印的吐槽档案" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "先去吐槽一次" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("renders immediate grounded report sections and then applies a refined report", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));
    saveLatestRoast(result);
    render(<ReportPage />);

    expect(await screen.findByRole("heading", { name: "AI吐槽大会：关于你的非正式喜剧观察报告" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "喜剧人格标签" })).toBeInTheDocument();
    for (const tag of result.comedyTags) expect(screen.getByText(tag)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "最有趣特征" })).toBeInTheDocument();
    expect(screen.getByText(result.observations[0].title)).toBeInTheDocument();
    expect(screen.getByText(result.observations[0].body)).toBeInTheDocument();
    expect(screen.getByText("以下数据均为喜剧化虚构，不是真实心理测量。")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "现场气氛值" })).toHaveAttribute("value", "88");
    expect(screen.getByRole("heading", { name: "年度喜剧奖项" })).toBeInTheDocument();
    expect(screen.getByText(result.award.title)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本场最佳金句" })).toBeInTheDocument();

    resolveFetch(await okResponse());
    expect(await screen.findByText(refined.award.title)).toBeInTheDocument();
    expect(screen.getAllByText(refined.comedyTags[0]).length).toBeGreaterThan(0);
  });

  it("keeps local seed content and reports degradation when refinement fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("secret raw error"));
    saveLatestRoast(result);
    render(<ReportPage />);

    expect(await screen.findByText(result.bestJoke)).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("报告精修暂时离线，当前展示本地喜剧档案。");
    expect(screen.queryByText(/secret raw error/)).not.toBeInTheDocument();
  });

  it("aborts refinement on unmount and does not start twice in StrictMode", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(fetch).mockImplementation((_url, options) => {
      signals.push(options?.signal as AbortSignal);
      return new Promise(() => {});
    });
    saveLatestRoast(result);
    const { unmount } = render(<ReportPage />, { reactStrictMode: true });
    await screen.findByText(result.bestJoke);
    unmount();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(true);
  });

  it("ignores a late response after unmount", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    saveLatestRoast(result);
    const view = render(<ReportPage />);
    await screen.findByText(result.bestJoke);
    view.unmount();
    await act(async () => resolveFetch(await okResponse()));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("auto-opens sharing once after hydration for ?share=1", async () => {
    history.replaceState({}, "", "/report?share=1");
    saveLatestRoast(result);
    render(<ReportPage />);
    const dialog = await screen.findByRole("dialog", { name: "分享卡片预览" });
    expect(dialog).toBeVisible();
    expect(screen.getByRole("button", { name: "关闭分享卡片预览" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "关闭分享卡片预览" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("copies the best joke with accessible success and failure feedback", async () => {
    saveLatestRoast(result);
    const { unmount } = render(<ReportPage />);
    await userEvent.click(await screen.findByRole("button", { name: "复制最佳金句" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(refined.bestJoke);
    expect(screen.getByRole("status")).toHaveTextContent("最佳金句已复制");
    unmount();

    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    render(<ReportPage />);
    await userEvent.click(await screen.findByRole("button", { name: "复制最佳金句" }));
    expect(screen.getByRole("status")).toHaveTextContent("复制失败，请手动选择金句复制");
  });

  it("has all report actions and destinations", async () => {
    saveLatestRoast(result);
    render(<ReportPage />);
    expect(await screen.findByRole("button", { name: "生成分享卡" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制最佳金句" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "再吐槽一次" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("link", { name: "发起复仇赛" })).toHaveAttribute("href", "/battle");
  });

  it("closes the modal with Escape or backdrop and restores focus", async () => {
    saveLatestRoast(result);
    render(<ReportPage />);
    const opener = await screen.findByRole("button", { name: "生成分享卡" });
    await userEvent.click(opener);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();

    await userEvent.click(opener);
    fireEvent.mouseDown(screen.getByTestId("share-backdrop"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
