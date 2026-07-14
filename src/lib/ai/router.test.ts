import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { roastResultSchema } from "@/lib/domain/roast";
import { ProviderError, reportResultSchema, type Provider, type ProviderSet } from "./provider";
import { routeComeback, routeComebackTraced, routeReport, routeReportTraced, routeRoast, routeRoastTraced } from "./router";

const roast = roastResultSchema.parse({
  opening: "开场",
  observations: [1, 2, 3].map((n) => ({ title: `观察${n}`, body: "内容", tag: "标签" })),
  bestJoke: "金句",
  reverseCompliment: "夸奖",
  comedyTags: ["一", "二", "三"],
  metrics: { atmosphere: 80, stubbornness: 70, casualCredibility: 60 },
  award: { title: "奖项", citation: "颁奖词" },
  safetyMode: "standard",
});
const report = reportResultSchema.parse({
  comedyTags: ["一", "二", "三"],
  metrics: roast.metrics,
  award: roast.award,
  bestJoke: roast.bestJoke,
  fictionalDisclaimer: "以下指标均为喜剧化虚构，不是真实测量。",
});

function provider(overrides: Partial<Provider> = {}): Provider {
  return {
    roast: vi.fn().mockResolvedValue(roast),
    comeback: vi.fn().mockResolvedValue({ reply: "回击", wit: 80, force: 70, stubbornness: 60, support: 50 }),
    report: vi.fn().mockResolvedValue(report),
    ...overrides,
  };
}

function providers(overrides: Partial<ProviderSet> = {}): ProviderSet {
  return { deepseek: provider(), kimi: provider(), mock: provider(), ...overrides };
}

const textInput = { text: "朋友圈文案", level: "familiar", mode: "moments", safetyMode: "standard" } as const;
const imageInput = { ...textInput, image: { dataUrl: "data:image/png;base64,AA==", mimeType: "image/png", size: 1 } } as const;

describe("routeRoast", () => {
  it("traces the actual Kimi fallback provider", async () => {
    const set = providers({ deepseek: provider({ roast: vi.fn().mockRejectedValue(new ProviderError("timeout", true)) }) });
    await expect(routeRoastTraced(textInput, set, { deepseekConfigured: true, kimiConfigured: true })).resolves.toEqual({ data: roast, provider: "kimi" });
  });

  it("traces Mock when no provider is configured", async () => {
    await expect(routeRoastTraced(textInput, providers(), { deepseekConfigured: false, kimiConfigured: false })).resolves.toEqual({ data: roast, provider: "mock" });
  });
  it("routes images to Kimi and never DeepSeek", async () => {
    const set = providers();
    await routeRoast(imageInput, set, { deepseekConfigured: true, kimiConfigured: true });
    expect(set.kimi.roast).toHaveBeenCalledOnce();
    expect(set.deepseek.roast).not.toHaveBeenCalled();
  });

  it("returns a valid DeepSeek text response", async () => {
    const set = providers();
    await expect(routeRoast(textInput, set, { deepseekConfigured: true, kimiConfigured: true })).resolves.toEqual(roast);
    expect(set.deepseek.roast).toHaveBeenCalledOnce();
    expect(set.kimi.roast).not.toHaveBeenCalled();
  });

  it("falls back to Kimi after a retryable DeepSeek failure", async () => {
    const deepseek = provider({ roast: vi.fn().mockRejectedValue(new ProviderError("timeout", true)) });
    const set = providers({ deepseek });
    await routeRoast(textInput, set, { deepseekConfigured: true, kimiConfigured: true });
    expect(set.kimi.roast).toHaveBeenCalledOnce();
  });

  it("does not fall back for a configured provider auth failure", async () => {
    const error = new ProviderError("auth", false);
    const set = providers({ deepseek: provider({ roast: vi.fn().mockRejectedValue(error) }) });
    await expect(routeRoast(textInput, set, { deepseekConfigured: true, kimiConfigured: true })).rejects.toBe(error);
    expect(set.kimi.roast).not.toHaveBeenCalled();
  });

  it("uses Kimi when the primary key is missing and Kimi is configured", async () => {
    const set = providers();
    await routeRoast(textInput, set, { deepseekConfigured: false, kimiConfigured: true });
    expect(set.deepseek.roast).not.toHaveBeenCalled();
    expect(set.kimi.roast).toHaveBeenCalledOnce();
  });

  it("uses Mock when neither text provider is configured", async () => {
    const set = providers();
    await expect(routeRoast(textInput, set, { deepseekConfigured: false, kimiConfigured: false })).resolves.toEqual(roast);
    expect(set.mock.roast).toHaveBeenCalledOnce();
  });

  it("falls back when DeepSeek returns an invalid schema", async () => {
    const set = providers({ deepseek: provider({ roast: vi.fn().mockResolvedValue({ nope: true }) }) });
    await expect(routeRoast(textInput, set, { deepseekConfigured: true, kimiConfigured: true })).resolves.toEqual(roast);
    expect(set.kimi.roast).toHaveBeenCalledOnce();
  });

  it("treats extra provider fields as an invalid response and falls back", async () => {
    const set = providers({ deepseek: provider({ roast: vi.fn().mockResolvedValue({ ...roast, unexpected: true }) }) });
    await routeRoast(textInput, set, { deepseekConfigured: true, kimiConfigured: true });
    expect(set.kimi.roast).toHaveBeenCalledOnce();
  });

  it("surfaces an invalid image response instead of showing Mock content", async () => {
    const set = providers({ kimi: provider({ roast: vi.fn().mockResolvedValue({ nope: true }) }) });
    await expect(routeRoast(imageInput, set, { deepseekConfigured: true, kimiConfigured: true })).rejects.toBeInstanceOf(ProviderError);
    expect(set.deepseek.roast).not.toHaveBeenCalled();
    expect(set.mock.roast).not.toHaveBeenCalled();
  });

  it("surfaces a retryable image provider failure instead of showing Mock content", async () => {
    const set = providers({ kimi: provider({ roast: vi.fn().mockRejectedValue(new ProviderError("timeout", true)) }) });
    await expect(routeRoastTraced(imageInput, set, { deepseekConfigured: true, kimiConfigured: true })).rejects.toMatchObject({ kind: "timeout" });
    expect(set.deepseek.roast).not.toHaveBeenCalled();
    expect(set.mock.roast).not.toHaveBeenCalled();
  });

  it("uses Mock when explicitly forced", async () => {
    const set = providers();
    await routeRoast(textInput, set, { mockMode: true, deepseekConfigured: true, kimiConfigured: true });
    expect(set.mock.roast).toHaveBeenCalledOnce();
    expect(set.deepseek.roast).not.toHaveBeenCalled();
  });
});

it("prefers the recorded provider for comeback and validates its result", async () => {
  const set = providers();
  await routeComeback({ round: 1, userLine: "我不服", priorTurns: [], roastContext: roast, preferredProvider: "kimi", safetyMode: "standard" }, set, { kimiConfigured: true, deepseekConfigured: true });
  expect(set.kimi.comeback).toHaveBeenCalledOnce();
  expect(set.deepseek.comeback).not.toHaveBeenCalled();
});

it("routes reports through DeepSeek then Kimi", async () => {
  const set = providers({ deepseek: provider({ report: vi.fn().mockRejectedValue(new ProviderError("upstream", true)) }) });
  await routeReport({ roast }, set, { deepseekConfigured: true, kimiConfigured: true });
  expect(set.kimi.report).toHaveBeenCalledOnce();
});

it("traces structured provider fallbacks", async () => {
  const set = providers({ deepseek: provider({
    comeback: vi.fn().mockRejectedValue(new ProviderError("timeout", true)),
    report: vi.fn().mockRejectedValue(new ProviderError("timeout", true)),
  }) });
  await expect(routeComebackTraced({ round: 1, userLine: "不服", priorTurns: [], roastContext: { opening: "开场" }, safetyMode: "standard" }, set, { deepseekConfigured: true, kimiConfigured: true })).resolves.toMatchObject({ provider: "kimi" });
  await expect(routeReportTraced({ roast }, set, { deepseekConfigured: true, kimiConfigured: true })).resolves.toMatchObject({ provider: "kimi" });
});

describe("routeComeback policy", () => {
  const input = { round: 1, userLine: "我不服", priorTurns: [], roastContext: roast, safetyMode: "standard" } as const;

  it("uses forced Mock", async () => {
    const set = providers();
    await routeComeback(input, set, { mockMode: true, deepseekConfigured: true, kimiConfigured: true });
    expect(set.mock.comeback).toHaveBeenCalledOnce();
    expect(set.deepseek.comeback).not.toHaveBeenCalled();
  });

  it("uses Mock when no provider is configured", async () => {
    const set = providers();
    await routeComeback(input, set, { deepseekConfigured: false, kimiConfigured: false });
    expect(set.mock.comeback).toHaveBeenCalledOnce();
  });

  it("falls back after an invalid preferred-provider response", async () => {
    const set = providers({ kimi: provider({ comeback: vi.fn().mockResolvedValue({ nope: true }) }) });
    await routeComeback({ ...input, preferredProvider: "kimi" }, set, { deepseekConfigured: true, kimiConfigured: true });
    expect(set.deepseek.comeback).toHaveBeenCalledOnce();
  });

  it("falls back after a retryable preferred-provider failure", async () => {
    const set = providers({ kimi: provider({ comeback: vi.fn().mockRejectedValue(new ProviderError("rate_limit", true)) }) });
    await routeComeback({ ...input, preferredProvider: "kimi" }, set, { deepseekConfigured: true, kimiConfigured: true });
    expect(set.deepseek.comeback).toHaveBeenCalledOnce();
  });

  it("does not fall back after nonretryable auth", async () => {
    const set = providers({ deepseek: provider({ comeback: vi.fn().mockRejectedValue(new ProviderError("auth", false)) }) });
    await expect(routeComeback(input, set, { deepseekConfigured: true, kimiConfigured: true })).rejects.toMatchObject({ kind: "auth" });
    expect(set.kimi.comeback).not.toHaveBeenCalled();
  });
});

describe("routeReport policy", () => {
  const input = { roast } as const;

  it("uses forced Mock and validates the report contract", async () => {
    const set = providers();
    await expect(routeReport(input, set, { mockMode: true })).resolves.toEqual(report);
    expect(set.mock.report).toHaveBeenCalledOnce();
  });

  it("prefers the recorded provider", async () => {
    const set = providers();
    await routeReport({ ...input, preferredProvider: "kimi" }, set, { deepseekConfigured: true, kimiConfigured: true });
    expect(set.kimi.report).toHaveBeenCalledOnce();
    expect(set.deepseek.report).not.toHaveBeenCalled();
  });

  it("falls back after invalid schema and retryable upstream failure", async () => {
    const invalidSet = providers({ deepseek: provider({ report: vi.fn().mockResolvedValue({ nope: true }) }) });
    await expect(routeReport(input, invalidSet, { deepseekConfigured: true, kimiConfigured: true })).resolves.toEqual(report);
    const retrySet = providers({ deepseek: provider({ report: vi.fn().mockRejectedValue(new ProviderError("timeout", true)) }) });
    await expect(routeReport(input, retrySet, { deepseekConfigured: true, kimiConfigured: true })).resolves.toEqual(report);
  });

  it("does not fall back after nonretryable failure and uses Mock for missing config", async () => {
    const set = providers({ deepseek: provider({ report: vi.fn().mockRejectedValue(new ProviderError("auth", false)) }) });
    await expect(routeReport(input, set, { deepseekConfigured: true, kimiConfigured: true })).rejects.toMatchObject({ kind: "auth" });
    expect(set.kimi.report).not.toHaveBeenCalled();
    const missing = providers();
    await routeReport(input, missing, { deepseekConfigured: false, kimiConfigured: false });
    expect(missing.mock.report).toHaveBeenCalledOnce();
  });
});
