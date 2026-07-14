import { describe, expect, it } from "vitest";
import { comebackResultSchema, MAX_COMEBACK_REPLY_CHARS, normalizeProviderError, providerRoastResultSchema, reportResultSchema } from "./provider";
import { ROAST_TEXT_LIMITS } from "@/lib/domain/roast";

describe("provider error normalization", () => {
  it.each([
    [{ name: "APIConnectionTimeoutError" }, "timeout", true],
    [{ code: "ETIMEDOUT" }, "timeout", true],
    [{ status: 408 }, "timeout", true],
    [{ status: 429 }, "rate_limit", true],
    [{ status: 500 }, "upstream", true],
    [{ status: 503 }, "upstream", true],
    [{ status: 401 }, "auth", false],
    [{ status: 403 }, "auth", false],
    [{ status: 400 }, "invalid_response", false],
    [{ status: 404 }, "invalid_response", false],
    [{ status: 422 }, "invalid_response", false],
  ])("classifies %# conservatively", (source, kind, retryable) => {
    expect(normalizeProviderError(source)).toMatchObject({ kind, retryable });
  });
});

it("uses strict provider output schemas", () => {
  expect(() => comebackResultSchema.parse({ reply: "回击", wit: 1, force: 2, stubbornness: 3, support: 4, extra: true })).toThrow();
  expect(() => reportResultSchema.parse({ comedyTags: ["一", "二", "三"], metrics: { atmosphere: 1, stubbornness: 2, casualCredibility: 3 }, award: { title: "奖", citation: "词" }, bestJoke: "句", fictionalDisclaimer: "虚构", extra: true })).toThrow();
  expect(() => providerRoastResultSchema.parse({
    opening: "开场",
    observations: [1, 2, 3].map(() => ({ title: "题", body: "文", tag: "签", extra: true })),
    bestJoke: "句",
    reverseCompliment: "夸",
    comedyTags: ["一", "二", "三"],
    metrics: { atmosphere: 1, stubbornness: 2, casualCredibility: 3 },
    award: { title: "奖", citation: "词" },
    safetyMode: "standard",
  })).toThrow();
});

it("bounds comeback replies shared with the battle domain", () => {
  const scores = { wit: 1, force: 2, stubbornness: 3, support: 4 };
  expect(comebackResultSchema.parse({ reply: "回".repeat(MAX_COMEBACK_REPLY_CHARS), ...scores }).reply).toHaveLength(MAX_COMEBACK_REPLY_CHARS);
  expect(() => comebackResultSchema.parse({ reply: "回".repeat(MAX_COMEBACK_REPLY_CHARS + 1), ...scores })).toThrow();
});

it("rejects oversized standalone report strings using shared roast bounds", () => {
  const report = { comedyTags: ["一", "二", "三"], metrics: { atmosphere: 1, stubbornness: 2, casualCredibility: 3 }, award: { title: "奖", citation: "词" }, bestJoke: "句", fictionalDisclaimer: "喜剧化虚构" };
  expect(reportResultSchema.safeParse({ ...report, bestJoke: "句".repeat(ROAST_TEXT_LIMITS.bestJoke) }).success).toBe(true);
  expect(reportResultSchema.safeParse({ ...report, bestJoke: "句".repeat(ROAST_TEXT_LIMITS.bestJoke + 1) }).success).toBe(false);
  expect(reportResultSchema.safeParse({ ...report, comedyTags: ["签".repeat(ROAST_TEXT_LIMITS.tag + 1), "二", "三"] }).success).toBe(false);
  expect(reportResultSchema.safeParse({ ...report, award: { title: "奖", citation: "词".repeat(ROAST_TEXT_LIMITS.awardCitation + 1) } }).success).toBe(false);
});
