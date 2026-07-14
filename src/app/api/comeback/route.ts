import { z } from "zod";
import { comebackResultSchema, ProviderError, type ProviderComebackInput } from "@/lib/ai/provider";
import { Generated, RequestBodyError, invalidRequest, json, payloadTooLarge, providerFailure, readBoundedJson } from "@/lib/api/server";
import { safeComebackFallback } from "@/lib/api/safe-fallbacks";
import { assertSafeOutput, UnsafeOutputError } from "@/lib/safety/filter";
import { detectSafetyMode, type SafetyMode } from "@/lib/safety/policy";

const boundedText = z.string().trim().min(1).max(2_000);
const roastContextSchema = z.object({
  opening: boundedText,
  bestJoke: boundedText.optional(),
  observations: z.array(z.object({
    title: z.string().trim().min(1).max(500),
    body: boundedText,
    tag: z.string().trim().min(1).max(200),
  }).strict()).max(5).optional(),
}).strict();
const comebackRequestSchema = z.object({
  userLine: boundedText,
  round: z.number().int().min(1).max(5),
  priorTurns: z.array(z.object({ userLine: boundedText, reply: boundedText }).strict()).max(5),
  roastContext: roastContextSchema,
  preferredProvider: z.enum(["deepseek", "kimi"]).optional(),
}).strict();

type ComebackInput = ProviderComebackInput & { safetyMode: SafetyMode };
export interface ComebackRouteDependencies { generate(input: ComebackInput): Promise<Generated> }

const productionDependencies: ComebackRouteDependencies = {
  async generate(input) {
    const { routeComebackTraced } = await import("@/lib/ai/router");
    return routeComebackTraced(input);
  },
};

function validate(result: Generated) {
  try { return { data: assertSafeOutput(comebackResultSchema.parse(result.data)), provider: result.provider }; }
  catch (error) {
    if (error instanceof UnsafeOutputError) throw error;
    throw new ProviderError("invalid_response", true, { cause: error });
  }
}
function reason(error: unknown): "safety" | "invalid_response" | null {
  return error instanceof UnsafeOutputError ? "safety" : error instanceof ProviderError && error.kind === "invalid_response" ? "invalid_response" : null;
}

export function createComebackHandler(dependencies: ComebackRouteDependencies) {
  return async function handleComeback(request: Request): Promise<Response> {
    let raw: unknown;
    try { raw = await readBoundedJson(request); }
    catch (error) { return error instanceof RequestBodyError && error.status === 413 ? payloadTooLarge() : invalidRequest(); }
    const parsed = comebackRequestSchema.safeParse(raw);
    if (!parsed.success) return invalidRequest();
    const input: ComebackInput = { ...parsed.data, round: parsed.data.round as 1 | 2 | 3 | 4 | 5, safetyMode: detectSafetyMode(parsed.data.userLine) };
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
          return json({ data: safeComebackFallback(), meta: { provider: "mock", degraded: true, reason: fallbackReason } });
        }
      }
    } catch (error) { return providerFailure(error); }
  };
}

export const POST = createComebackHandler(productionDependencies);
