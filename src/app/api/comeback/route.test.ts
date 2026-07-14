import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/ai/provider";
import { createComebackHandler, type ComebackRouteDependencies } from "./route";

const safe = { reply: "这句反击很有精神，证据还在路上。", wit: 80, force: 70, stubbornness: 60, support: 50 };
const request = (body: unknown) => new Request("http://localhost/api/comeback", { method: "POST", body: JSON.stringify(body) });
const input = { userLine: "我不服", round: 1, priorTurns: [], roastContext: { opening: "开场" } };

describe("POST /api/comeback", () => {
  it.each([{ ...input, userLine: "" }, { ...input, round: 0 }, { ...input, round: 6 }])("validates line and round bounds", async (body) => {
    const response = await createComebackHandler({ generate: vi.fn() })(request(body));
    expect(response.status).toBe(400);
  });

  it.each([
    { ...input, userLine: "x".repeat(2001) },
    { ...input, priorTurns: Array.from({ length: 6 }, () => ({ userLine: "a", reply: "b" })) },
    { ...input, roastContext: { opening: "x".repeat(2001) } },
    { ...input, roastContext: { opening: "开场", secret: "internal" } },
  ])("rejects bounded context and history violations with a generic message", async (body) => {
    const response = await createComebackHandler({ generate: vi.fn() })(request(body));
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json).toEqual({ code: "INVALID_REQUEST", message: expect.any(String), retryable: false });
    expect(json.message).not.toMatch(/2000|too_big|opening|secret|Zod/i);
  });

  it("derives and forwards gentle mode", async () => {
    const generate = vi.fn().mockResolvedValue({ data: safe, provider: "deepseek" });
    await createComebackHandler({ generate })(request({ ...input, userLine: "我最近很难受，觉得自己什么都做不好" }));
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ safetyMode: "gentle" }));
  });

  it("returns a successful provider envelope", async () => {
    const deps: ComebackRouteDependencies = { generate: vi.fn().mockResolvedValue({ data: safe, provider: "deepseek" }) };
    const response = await createComebackHandler(deps)(request(input));
    expect(await response.json()).toEqual({ data: safe, meta: { provider: "deepseek", degraded: false } });
  });

  it("retries unsafe reply then falls back to safe Mock", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { ...safe, reply: "你就是个废物" }, provider: "kimi" });
    const response = await createComebackHandler({ generate })(request(input));
    const json = await response.json();
    expect(generate).toHaveBeenCalledTimes(2);
    expect(json.meta).toEqual({ provider: "mock", degraded: true, reason: "safety" });
    expect(json.data.reply).not.toContain("废物");
  });

  it("retries invalid output and returns the second provider", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ data: { reply: "缺少分数" }, provider: "deepseek" })
      .mockResolvedValueOnce({ data: safe, provider: "kimi" });
    const response = await createComebackHandler({ generate })(request(input));
    expect(await response.json()).toEqual({ data: safe, meta: { provider: "kimi", degraded: false } });
    expect(generate).toHaveBeenNthCalledWith(2, expect.objectContaining({ safetyMode: "gentle" }));
  });

  it("uses safe Mock after invalid output twice", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { reply: "缺少分数" }, provider: "deepseek" });
    const response = await createComebackHandler({ generate })(request(input));
    const json = await response.json();
    expect(generate).toHaveBeenCalledTimes(2);
    expect(json.meta).toEqual({ provider: "mock", degraded: true, reason: "invalid_response" });
  });

  it("treats an oversized provider reply as invalid, retries gently, then falls back", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { ...safe, reply: "回".repeat(4_001) }, provider: "deepseek" });
    const response = await createComebackHandler({ generate })(request(input));
    const json = await response.json();
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenNthCalledWith(2, expect.objectContaining({ safetyMode: "gentle" }));
    expect(json.meta).toEqual({ provider: "mock", degraded: true, reason: "invalid_response" });
  });

  it.each([
    [new ProviderError("rate_limit", true), "SERVICE_UNAVAILABLE"],
    [new ProviderError("auth", false, { cause: new Error("SECRET raw prompt data:image/png;base64,AA==") }), "AI_UNAVAILABLE"],
  ])("returns generic provider errors without leaking inputs", async (error, code) => {
    const response = await createComebackHandler({ generate: vi.fn().mockRejectedValue(error) })(request({ ...input, userLine: "raw prompt" }));
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(body).toContain(code);
    expect(body).not.toMatch(/SECRET|raw prompt|data:image/);
  });
});
