import { z } from "zod";
import { providerRoastResultSchema, ProviderError, reportResultSchema, type ProviderReportInput } from "@/lib/ai/provider";
import { Generated, RequestBodyError, invalidRequest, json, payloadTooLarge, providerFailure, readBoundedJson } from "@/lib/api/server";
import { safeReportFallback } from "@/lib/api/safe-fallbacks";
import { assertSafeOutput, extractStrings, UnsafeOutputError } from "@/lib/safety/filter";

const boundedRoastResultSchema = providerRoastResultSchema.superRefine((value, context) => {
  if (extractStrings(value).some((text) => text.length > 12_000)) {
    context.addIssue({ code: "custom", message: "Report context exceeds its field bounds" });
  }
});
const reportRequestSchema = z.object({
  roast: boundedRoastResultSchema,
  preferredProvider: z.enum(["deepseek", "kimi"]).optional(),
}).strict();
const safeReportResultSchema = reportResultSchema.safeExtend({
  fictionalDisclaimer: z.string().trim().min(1).refine((value) => value.includes("虚构"), "Report must clearly state that metrics are fictional"),
}).strict();

export interface ReportRouteDependencies { generate(input: ProviderReportInput): Promise<Generated> }
const productionDependencies: ReportRouteDependencies = {
  async generate(input) {
    const { routeReportTraced } = await import("@/lib/ai/router");
    return routeReportTraced(input);
  },
};

function validate(result: Generated) {
  try { return { data: assertSafeOutput(safeReportResultSchema.parse(result.data)), provider: result.provider }; }
  catch (error) {
    if (error instanceof UnsafeOutputError) throw error;
    throw new ProviderError("invalid_response", true, { cause: error });
  }
}
function reason(error: unknown): "safety" | "invalid_response" | null {
  return error instanceof UnsafeOutputError ? "safety" : error instanceof ProviderError && error.kind === "invalid_response" ? "invalid_response" : null;
}

export function createReportHandler(dependencies: ReportRouteDependencies) {
  return async function handleReport(request: Request): Promise<Response> {
    let raw: unknown;
    try { raw = await readBoundedJson(request); }
    catch (error) { return error instanceof RequestBodyError && error.status === 413 ? payloadTooLarge() : invalidRequest(); }
    const parsed = reportRequestSchema.safeParse(raw);
    if (!parsed.success) return invalidRequest();
    const input: ProviderReportInput = { ...parsed.data, safetyMode: parsed.data.roast.safetyMode };
    try {
      try {
        const result = validate(await dependencies.generate(input));
        return json({ data: result.data, meta: { provider: result.provider, degraded: false } });
      } catch (firstError) {
        if (!reason(firstError)) throw firstError;
        try {
          const result = validate(await dependencies.generate({ ...input, safetyMode: "gentle" }));
          return json({ data: result.data, meta: { provider: result.provider, degraded: false } });
        } catch (secondError) {
          const fallbackReason = reason(secondError);
          if (!fallbackReason) throw secondError;
          return json({ data: safeReportFallback(), meta: { provider: "mock", degraded: true, reason: fallbackReason } });
        }
      }
    } catch (error) { return providerFailure(error); }
  };
}

export const POST = createReportHandler(productionDependencies);
