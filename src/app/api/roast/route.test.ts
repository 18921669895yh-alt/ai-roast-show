import { describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/lib/ai/provider";
import { createRoastHandler, type RoastRouteDependencies } from "./route";

const safeRoast = {
  opening: "今晚从你主动分享的素材开麦。",
  observations: [1, 2, 3].map((n) => ({ title: `观察${n}`, body: "这件外套和抱臂姿势很有舞台感 😎", tag: "舞台感" })),
  bestJoke: "你的随便不是没答案，是答案还在候场。",
  reverseCompliment: "认真说，你很会观察细节。",
  comedyTags: ["气氛担当", "细节雷达", "精准收尾"],
  metrics: { atmosphere: 80, stubbornness: 60, casualCredibility: 40 },
  award: { title: "年度随意奖", citation: "颁给把随便说得很有主见的你。" },
  safetyMode: "standard" as const,
};

function request(body: unknown) {
  return new Request("http://localhost/api/roast", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

function deps(fn = vi.fn().mockResolvedValue({ data: safeRoast, provider: "deepseek" as const })): RoastRouteDependencies {
  return { generate: fn };
}

describe("POST /api/roast", () => {
  it.each([
    [{}, 400],
    [{ text: "x", level: "familiar", mode: "photo", image: { dataUrl: "data:image/gif;base64,AA==", mimeType: "image/gif", size: 1 } }, 400],
    [{ text: "x", level: "familiar", mode: "photo", image: { dataUrl: `data:image/png;base64,${"A".repeat(14_000_000)}`, mimeType: "image/png", size: 10_500_000 } }, 413],
  ])("rejects invalid input", async (body, status) => {
    const response = await createRoastHandler(deps())(request(body));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ code: status === 413 ? "PAYLOAD_TOO_LARGE" : "INVALID_REQUEST", retryable: false });
  });

  it("does not expose schema details in validation errors", async () => {
    const response = await createRoastHandler(deps())(request({ text: "x", level: "SECRET_LEVEL", mode: "chat" }));
    const json = await response.json();
    expect(json.message).not.toMatch(/SECRET_LEVEL|level|Invalid option|Zod/i);
  });

  it("returns the provider envelope and derives gentle mode on the server", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { ...safeRoast, safetyMode: "gentle" }, provider: "deepseek" });
    const response = await createRoastHandler(deps(generate))(request({ text: "我最近很难受，觉得自己什么都做不好", level: "stage", mode: "chat" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { safetyMode: "gentle" }, meta: { provider: "deepseek", degraded: false } });
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ safetyMode: "gentle" }));
  });

  it("overwrites a provider's standard safetyMode for distress input", async () => {
    const generate = vi.fn().mockResolvedValue({ data: safeRoast, provider: "deepseek" });
    const response = await createRoastHandler(deps(generate))(request({ text: "我想结束生命", level: "stage", mode: "chat" }));
    expect(await response.json()).toMatchObject({ data: { safetyMode: "gentle" }, meta: { degraded: false } });
  });

  it("retries unsafe output once in gentle mode", async () => {
    const generate = vi.fn()
      .mockResolvedValueOnce({ data: { ...safeRoast, opening: "你就是个废物" }, provider: "deepseek" })
      .mockResolvedValueOnce({ data: { ...safeRoast, safetyMode: "gentle" }, provider: "kimi" });
    const response = await createRoastHandler(deps(generate))(request({ text: "普通文案", level: "familiar", mode: "chat" }));
    expect(response.status).toBe(200);
    expect((await response.json()).meta).toEqual({ provider: "kimi", degraded: false });
    expect(generate).toHaveBeenNthCalledWith(2, expect.objectContaining({ safetyMode: "gentle" }));
  });

  it("uses a deterministic safe Mock after two unsafe outputs", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { ...safeRoast, opening: "你长得真丑" }, provider: "deepseek" });
    const response = await createRoastHandler(deps(generate))(request({ text: "普通文案", level: "familiar", mode: "chat" }));
    const json = await response.json();
    expect(json.meta).toEqual({ provider: "mock", degraded: true, reason: "safety" });
    expect(JSON.stringify(json)).not.toContain("你长得真丑");
  });

  it.each([
    [new ProviderError("rate_limit", true), "SERVICE_UNAVAILABLE"],
    [new ProviderError("auth", false, { cause: new Error("SECRET_KEY raw prompt data:image/png;base64,AA==") }), "AI_UNAVAILABLE"],
  ])("returns a generic 503 for provider failures", async (error, code) => {
    const response = await createRoastHandler(deps(vi.fn().mockRejectedValue(error)))(request({ text: "raw prompt", level: "familiar", mode: "chat" }));
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(body).toContain(code);
    expect(body).not.toMatch(/SECRET_KEY|raw prompt|data:image/);
  });
});
