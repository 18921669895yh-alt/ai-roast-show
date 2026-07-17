import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_ROAST_STORAGE_KEY } from "@/lib/domain/storage";
import RoastPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const result = {
  opening: "主持人开场",
  observations: [1, 2, 3].map((n) => ({ title: `观察${n}`, body: "一个有细节的喜剧观察。", tag: "细节" })),
  bestJoke: "你的随便不是没答案，是答案还在候场。",
  reverseCompliment: "其实你很会观察生活。",
  comedyTags: ["气氛担当", "细节雷达", "精准收尾"],
  metrics: { atmosphere: 80, stubbornness: 60, casualCredibility: 40 },
  award: { title: "年度随意奖", citation: "颁给把随便说得很有主见的你。" },
  safetyMode: "standard",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("RoastPage", () => {
  beforeEach(() => {
    push.mockReset();
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:proof"), revokeObjectURL: vi.fn() });
  });

  it("shows the host intro and accurate privacy disclosure", () => {
    render(<RoastPage />);
    expect(screen.getByText("下一位观众，请不要紧张。我们只是研究一下，你为什么这么有喜剧价值。")).toBeVisible();
    expect(screen.getByText(/照片会通过安全的服务器路由临时发送给 Kimi/)).toBeVisible();
    expect(screen.getByText(/本网站和服务器不会存储照片，也不会写入 localStorage 或公开画廊/)).toBeVisible();
    expect(screen.getByText(/服务提供方会依据其条款处理本次请求/)).toBeVisible();
    expect(screen.getByText(/生成的文字结果和报告会在这台设备上保存最多 24 小时/)).toBeVisible();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    main.focus();
    expect(main).toHaveFocus();
  });

  it("clears the latest local result with confirmation and status", async () => {
    const user = userEvent.setup();
    localStorage.setItem(AI_ROAST_STORAGE_KEY, "stored");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<RoastPage />);
    await user.click(screen.getByRole("button", { name: "清除最近结果" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(localStorage.getItem(AI_ROAST_STORAGE_KEY)).toBeNull();
    expect(screen.getByText("最近结果已从这台设备清除。")).toBeInTheDocument();
  });

  it("requires text or image and defaults to familiar", async () => {
    const user = userEvent.setup();
    render(<RoastPage />);
    expect(screen.getAllByRole("radio").find((radio) => (radio as HTMLInputElement).value === "familiar")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    expect(screen.getByRole("alert")).toHaveTextContent("请先交出一张照片或一段文字素材。");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts exact text, image, level and mode then stores and previews useful result text before navigation", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: result, meta: { provider: "kimi", degraded: false } }));
    render(<RoastPage />);
    await user.type(screen.getByRole("textbox", { name: "文字素材" }), "这是我昨天发的朋友圈，看起来很装。 ");
    await user.upload(screen.getByLabelText("上传照片"), new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb])], "proof.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("radio", { name: "锐评他的朋友圈" }));
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body));
    expect(payload).toMatchObject({ text: "这是我昨天发的朋友圈，看起来很装。", level: "familiar", mode: "moments", image: { mimeType: "image/jpeg", size: 4 } });
    expect(payload.image.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(await screen.findByRole("heading", { name: "右侧先听这几句" })).toBeVisible();
    expect(screen.getByText("主持人开场")).toBeVisible();
    expect(screen.getByText("观察1")).toBeVisible();
    expect(screen.getByText("你的随便不是没答案，是答案还在候场。")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "查看完整吐槽" }));
    expect(push).toHaveBeenCalledWith("/result");
    const persisted = localStorage.getItem(AI_ROAST_STORAGE_KEY);
    expect(JSON.parse(persisted ?? "{}")).toMatchObject({ version: 1, data: result });
    expect(persisted).not.toMatch(/data:image|proof/);
  });

  it("retains all input after failure and retries", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ code: "SERVICE_UNAVAILABLE", message: "private raw error", retryable: true }, 503))
      .mockResolvedValueOnce(jsonResponse({ data: result, meta: { provider: "mock", degraded: true } }));
    render(<RoastPage />);
    const textarea = screen.getByRole("textbox", { name: "文字素材" });
    await user.type(textarea, "我的朋友圈文案还在这里");
    await user.click(screen.getByRole("radio", { name: "随机开麦" }));
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    expect(await screen.findByRole("button", { name: "重新开麦" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "这次没有接上麦" })).toBeVisible();
    expect(screen.getByText("图片理解可能需要更久，请保留素材后重新生成。" )).toBeVisible();
    expect(textarea).toHaveValue("我的朋友圈文案还在这里");
    expect(screen.getByRole("radio", { name: "随机开麦" })).toBeChecked();
    expect(screen.getByRole("alert")).not.toHaveTextContent("private raw error");
    await user.click(screen.getByRole("button", { name: "重新生成" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByText("现场信号不稳，已切换安全演示内容。")).toBeVisible();
    expect(screen.getByRole("heading", { name: "右侧先听这几句" })).toBeVisible();
  });

  it("aborts an active request and returns to idle with inputs", async () => {
    const user = userEvent.setup();
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_input, init) => {
      signal = init?.signal ?? undefined;
      return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    });
    render(<RoastPage />);
    const textarea = screen.getByRole("textbox", { name: "文字素材" });
    await user.type(textarea, "取消后这段素材还在");
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    await user.click(await screen.findByRole("button", { name: "取消生成" }));
    expect(signal?.aborted).toBe(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "开始吐槽" })).toBeVisible());
    expect(textarea).toHaveValue("取消后这段素材还在");
  });

  it("prevents double submission", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined));
    render(<RoastPage />);
    await user.type(screen.getByRole("textbox", { name: "文字素材" }), "足够长的一段素材内容");
    const submit = screen.getByRole("button", { name: "开始吐槽" });
    await user.dblClick(submit);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("aborts the request when the page unmounts", async () => {
    const user = userEvent.setup();
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_input, init) => {
      signal = init?.signal ?? undefined;
      return new Promise(() => undefined);
    });
    const view = render(<RoastPage />);
    await user.type(screen.getByRole("textbox", { name: "文字素材" }), "卸载时需要取消这次请求");
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    await waitFor(() => expect(signal).toBeDefined());
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("aborts an in-progress FileReader when the page unmounts", async () => {
    const user = userEvent.setup();
    const nativeFileReader = FileReader;
    const abortRead = vi.fn();
    render(<RoastPage />);
    await user.upload(screen.getByLabelText("上传照片"), new File([new Uint8Array([0xff, 0xd8, 0xff])], "proof.jpg", { type: "image/jpeg" }));
    await screen.findByRole("img", { name: "已上传照片预览" });
    class PendingDataUrlReader extends nativeFileReader {
      override readAsDataURL() { /* deliberately pending */ }
      override abort() { abortRead(); super.abort(); }
    }
    vi.stubGlobal("FileReader", PendingDataUrlReader);
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    cleanup();
    expect(abortRead).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lets cancellation win over a concurrently resolving request", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));
    render(<RoastPage />);
    await user.type(screen.getByRole("textbox", { name: "文字素材" }), "取消必须阻止保存和跳转");
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    await user.click(await screen.findByRole("button", { name: "取消生成" }));
    resolveFetch(jsonResponse({ data: result, meta: { provider: "kimi", degraded: false } }));
    await Promise.resolve();
    expect(localStorage.getItem(AI_ROAST_STORAGE_KEY)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("allows an immediate retry after cancellation", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockImplementationOnce((_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))))
      .mockResolvedValueOnce(jsonResponse({ data: result, meta: { provider: "kimi", degraded: false } }));
    render(<RoastPage />);
    await user.type(screen.getByRole("textbox", { name: "文字素材" }), "取消之后马上重新提交");
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    await user.click(await screen.findByRole("button", { name: "取消生成" }));
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("heading", { name: "右侧先听这几句" })).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  it("submits successfully after the StrictMode setup-cleanup-setup cycle", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: result, meta: { provider: "kimi", degraded: false } }));
    render(<StrictMode><RoastPage /></StrictMode>);
    await user.type(screen.getByRole("textbox", { name: "文字素材" }), "严格模式下也要正常提交");
    await user.click(screen.getByRole("button", { name: "开始吐槽" }));
    expect(await screen.findByRole("heading", { name: "右侧先听这几句" })).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem(AI_ROAST_STORAGE_KEY)).not.toBeNull();
  });
});
