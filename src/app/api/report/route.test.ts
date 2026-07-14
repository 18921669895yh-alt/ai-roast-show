import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/ai/provider";
import { createReportHandler } from "./route";
import { ROAST_TEXT_LIMITS } from "@/lib/domain/roast";

const roast = {
  opening: "开场", observations: [1, 2, 3].map((n) => ({ title: `观察${n}`, body: "外套很抢镜", tag: "穿搭" })),
  bestJoke: "金句", reverseCompliment: "夸奖", comedyTags: ["一", "二", "三"],
  metrics: { atmosphere: 80, stubbornness: 70, casualCredibility: 60 }, award: { title: "奖项", citation: "颁奖词" }, safetyMode: "standard",
};
const safe = { comedyTags: ["一", "二", "三"], metrics: roast.metrics, award: roast.award, bestJoke: roast.bestJoke, fictionalDisclaimer: "以下指标均为喜剧化虚构，不是真实测量。" };
const request = (body: unknown) => new Request("http://localhost/api/report", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/report", () => {
  it("rejects an invalid request", async () => {
    const response = await createReportHandler({ generate: vi.fn() })(request({ roast: { secret: "Zod internal" } }));
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.message).not.toMatch(/secret|Zod|opening/i);
  });

  it("retries unsafe output and returns a safe second provider envelope", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ data: { ...safe, bestJoke: "你是白痴" }, provider: "deepseek" })
      .mockResolvedValueOnce({ data: safe, provider: "kimi" });
    const response = await createReportHandler({ generate })(request({ roast }));
    expect(await response.json()).toEqual({ data: safe, meta: { provider: "kimi", degraded: false } });
  });

  it("uses safe Mock after unsafe output twice", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { ...safe, bestJoke: "你真难看" }, provider: "deepseek" });
    const response = await createReportHandler({ generate })(request({ roast }));
    const json = await response.json();
    expect(json.meta).toEqual({ provider: "mock", degraded: true, reason: "safety" });
    expect(JSON.stringify(json)).not.toContain("你真难看");
  });

  it.each([
    [new ProviderError("upstream", true), "SERVICE_UNAVAILABLE"],
    [new ProviderError("auth", false, { cause: new Error("SECRET raw prompt data:image/png;base64,AA==") }), "AI_UNAVAILABLE"],
  ])("returns generic provider errors without leaking internals", async (error, code) => {
    const response = await createReportHandler({ generate: vi.fn().mockRejectedValue(error) })(request({ roast }));
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(body).toContain(code);
    expect(body).not.toMatch(/SECRET|raw prompt|data:image/);
  });

  it("returns a validated report envelope", async () => {
    const response = await createReportHandler({ generate: vi.fn().mockResolvedValue({ data: safe, provider: "kimi" }) })(request({ roast }));
    expect(await response.json()).toEqual({ data: safe, meta: { provider: "kimi", degraded: false } });
  });

  it("rejects oversized report context with a generic validation response", async () => {
    const response = await createReportHandler({ generate: vi.fn() })(request({ roast: { ...roast, bestJoke: "x".repeat(12_001) } }));
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json).toEqual({ code: "INVALID_REQUEST", message: expect.any(String), retryable: false });
    expect(json.message).not.toMatch(/12000|bestJoke|too_big/i);
  });

  it("retries invalid output and returns the second provider", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ data: { ...safe, fictionalDisclaimer: "这些指标很准确。" }, provider: "deepseek" })
      .mockResolvedValueOnce({ data: safe, provider: "kimi" });
    const response = await createReportHandler({ generate })(request({ roast }));
    expect(await response.json()).toEqual({ data: safe, meta: { provider: "kimi", degraded: false } });
    expect(generate).toHaveBeenNthCalledWith(2, expect.objectContaining({ safetyMode: "gentle" }));
  });

  it("retries a missing fictional disclaimer then uses Mock", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { ...safe, fictionalDisclaimer: "这些指标很准确。" }, provider: "deepseek" });
    const response = await createReportHandler({ generate })(request({ roast }));
    const json = await response.json();
    expect(generate).toHaveBeenCalledTimes(2);
    expect(json.meta).toEqual({ provider: "mock", degraded: true, reason: "invalid_response" });
    expect(json.data.fictionalDisclaimer).toContain("虚构");
  });

  it("retries an oversized provider report instead of returning poster-clipping copy", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ data: { ...safe, bestJoke: "句".repeat(ROAST_TEXT_LIMITS.bestJoke + 1) }, provider: "deepseek" })
      .mockResolvedValueOnce({ data: safe, provider: "kimi" });
    const response = await createReportHandler({ generate })(request({ roast }));
    expect(await response.json()).toEqual({ data: safe, meta: { provider: "kimi", degraded: false } });
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
