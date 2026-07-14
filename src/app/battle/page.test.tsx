import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BattlePage from "./page";
import type { RoastResult } from "@/lib/domain/roast";
import { saveBattleSeed } from "@/lib/domain/battle-seed";
import { saveLatestRoast } from "@/lib/domain/storage";

const roast: RoastResult = {
  opening: "开场",
  observations: [1, 2, 3].map((n) => ({ title: `观察${n}`, body: `内容${n}`, tag: "现场" })),
  bestJoke: "你把随意活成了严谨。",
  reverseCompliment: "认真夸一句。",
  comedyTags: ["松弛", "稳定", "自然"],
  metrics: { atmosphere: 80, stubbornness: 70, casualCredibility: 90 },
  award: { title: "奖项", citation: "颁奖词" },
  safetyMode: "standard",
};
const comeback = { reply: "接住了，再给你拐回来。", wit: 71, force: 72, stubbornness: 73, support: 74 };
const ok = (data = comeback, degraded = false) => Promise.resolve(new Response(JSON.stringify({ data, meta: { provider: degraded ? "mock" : "kimi", degraded } }), { status: 200 }));

async function ready() {
  expect(await screen.findByRole("heading", { name: /ROUND 1/ })).toBeInTheDocument();
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("battle page", () => {
  it("shows a themed empty state when neither result nor seed is valid", async () => {
    render(<BattlePage />);
    expect(await screen.findByRole("heading", { name: "还没有能接上的梗" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "先去吐槽一场" })).toHaveAttribute("href", "/roast");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("recovers from a battle seed, consumes it, and never renders a photo", async () => {
    saveBattleSeed({ version: 1, bestJoke: "只带一句梗进场" });
    render(<BattlePage />);
    await ready();
    expect(screen.getByText("只带一句梗进场")).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("submits quick and custom replies with bounded prior turns", async () => {
    const user = userEvent.setup();
    saveLatestRoast(roast);
    vi.mocked(fetch).mockImplementation(() => ok());
    render(<BattlePage />);
    await ready();

    await user.click(screen.getByRole("button", { name: "你一个AI懂什么" }));
    await screen.findByText(comeback.reply);
    const first = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(first).toEqual({ round: 1, userLine: "你一个AI懂什么", priorTurns: [], roastContext: { opening: roast.opening, bestJoke: roast.bestJoke, observations: roast.observations } });

    const input = screen.getByRole("textbox", { name: "来，回我一句" });
    await user.type(input, "这句是自定义反击！");
    await user.click(screen.getByRole("button", { name: "送出反击" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const second = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(second.round).toBe(2);
    expect(second.priorTurns).toEqual([{ userLine: "你一个AI懂什么", reply: comeback.reply }]);
  });

  it("successfully completes a request under StrictMode", async () => {
    saveLatestRoast(roast);
    vi.mocked(fetch).mockImplementation(() => ok());
    render(<StrictMode><BattlePage /></StrictMode>);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "你一个AI懂什么" }));
    expect(await screen.findByText(comeback.reply)).toBeInTheDocument();
  });

  it("announces a new reply and next round, then focuses the round heading", async () => {
    saveLatestRoast(roast);
    vi.mocked(fetch).mockImplementation(() => ok());
    render(<BattlePage />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "你先管好自己" }));
    const heading = await screen.findByRole("heading", { name: "ROUND 2" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("status", { name: "对决播报" })).toHaveTextContent(`${comeback.reply} ROUND 2`);
    expect(screen.getByRole("status", { name: "对决播报" })).not.toHaveTextContent(/71|72|73|74/);
  });

  it("validates success scores, shows meters and a degraded notice", async () => {
    saveLatestRoast(roast);
    vi.mocked(fetch).mockImplementation(() => ok({ ...comeback, wit: 120 }));
    render(<BattlePage />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "你先管好自己" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("现场信号不稳");
    expect(screen.queryByText(comeback.reply)).not.toBeInTheDocument();

    vi.mocked(fetch).mockImplementation(() => ok(comeback, true));
    fireEvent.click(screen.getByRole("button", { name: "重新反击" }));
    expect(await screen.findByText("已切换安全演示内容。" )).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "接梗能力" })).toHaveAttribute("aria-valuenow", "71");
    expect(screen.getByText("74", { selector: "output" })).toBeInTheDocument();
  });

  it("retains a failed draft, retries, and synchronously blocks double submit", async () => {
    const user = userEvent.setup();
    saveLatestRoast(roast);
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
    render(<BattlePage />);
    await ready();
    const input = screen.getByRole("textbox", { name: "来，回我一句" });
    await user.type(input, "我的草稿还在这里");
    const submit = screen.getByRole("button", { name: "送出反击" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(fetch).toHaveBeenCalledOnce();
    await act(async () => resolve(new Response("{}", { status: 503 })));
    expect(await screen.findByRole("button", { name: "重新反击" })).toBeInTheDocument();
    expect(input).toHaveValue("我的草稿还在这里");
  });

  it("aborts on cancel and ignores late responses after unmount", async () => {
    saveLatestRoast(roast);
    let signal: AbortSignal | undefined;
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>((done) => { resolve = done; });
    });
    const { unmount } = render(<BattlePage />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "你连身体都没有" }));
    fireEvent.click(await screen.findByRole("button", { name: "取消反击" }));
    expect(signal?.aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "你连身体都没有" }));
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve(await ok()));
  });

  it("ignores a cancelled late response after a replacement succeeds", async () => {
    saveLatestRoast(roast);
    let resolveFirst!: (value: Response) => void;
    vi.mocked(fetch)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => ok({ ...comeback, reply: "替补回应先到" }));
    render(<BattlePage />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "你连身体都没有" }));
    fireEvent.click(await screen.findByRole("button", { name: "取消反击" }));
    fireEvent.click(screen.getByRole("button", { name: "你先管好自己" }));
    expect(await screen.findByText("替补回应先到")).toBeInTheDocument();
    await act(async () => resolveFirst(await ok({ ...comeback, reply: "迟到的旧回应" })));
    expect(screen.queryByText("迟到的旧回应")).not.toBeInTheDocument();
    expect(screen.getAllByText("替补回应先到")).toHaveLength(1);
  });

  it("finishes five rounds, locks input, clears seed, and resets while keeping roast", async () => {
    const user = userEvent.setup();
    saveLatestRoast(roast);
    saveBattleSeed({ version: 1, bestJoke: roast.bestJoke });
    vi.mocked(fetch).mockImplementation(() => ok());
    render(<BattlePage />);
    await ready();
    for (let n = 0; n < 5; n += 1) {
      await user.click(screen.getByRole("button", { name: "这也叫脱口秀？" }));
      await screen.findByRole("heading", { name: n === 4 ? /对决结束/ : new RegExp(`ROUND ${n + 2}`) });
    }
    const outcome = screen.getByRole("heading", { name: /用户获胜|AI险胜|双方嘴都很硬|本场无人认输/ });
    expect(outcome).toHaveFocus();
    expect(screen.getByRole("status", { name: "对决播报" })).toHaveTextContent(`接住了，再给你拐回来。 ${outcome.textContent}`);
    expect(screen.getByRole("textbox", { name: "来，回我一句" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "领取吐槽报告" })).toHaveAttribute("href", "/report");
    expect(screen.getByRole("link", { name: "返回本场吐槽" })).toHaveAttribute("href", "/result");
    expect(sessionStorage.length).toBe(0);
    await user.click(screen.getByRole("button", { name: "再来一局" }));
    expect(screen.getByRole("heading", { name: /ROUND 1/ })).toBeInTheDocument();
    expect(screen.getByText(roast.bestJoke)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "来，回我一句" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "来，回我一句" })).toHaveFocus();
    expect(screen.getByRole("status", { name: "对决播报" })).toHaveTextContent("ROUND 1");
  });
});
