import { expect, it } from "vitest";
import { roastResultSchema } from "@/lib/domain/roast";
import { comebackResultSchema, reportResultSchema } from "./provider";
import { mockProvider } from "./mock";

const input = { text: "每次都说随便", level: "familiar", mode: "chat", safetyMode: "standard" } as const;

it("returns deterministic schema-valid safe Chinese results", async () => {
  const first = await mockProvider.roast(input);
  const second = await mockProvider.roast(input);
  expect(roastResultSchema.parse(first)).toEqual(roastResultSchema.parse(second));
  expect(roastResultSchema.parse(first).observations).toHaveLength(3);
  expect(comebackResultSchema.parse(await mockProvider.comeback({ round: 1, userLine: "不服", priorTurns: [], roastContext: first, safetyMode: "standard" }))).toMatchObject({ reply: expect.any(String) });
  const report = reportResultSchema.parse(await mockProvider.report({ roast: { arbitrary: true } }));
  expect(report.comedyTags).toHaveLength(3);
  expect(report.fictionalDisclaimer).toContain("虚构");
  expect(report).toEqual(reportResultSchema.parse(await mockProvider.report({ roast: "其他任意输入" })));
  report.comedyTags[0] = "被修改";
  expect(reportResultSchema.parse(await mockProvider.report({ roast: null })).comedyTags[0]).toBe("气氛担当");
});
