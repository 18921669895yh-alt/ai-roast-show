import { ProviderError, providerRoastResultSchema, type ProviderRoastInput } from "@/lib/ai/provider";
import { roastRequestSchema } from "@/lib/domain/roast";
import { Generated, RequestBodyError, invalidRequest, isOversizedImage, json, payloadTooLarge, providerFailure, readBoundedJson } from "@/lib/api/server";
import { safeRoastFallback } from "@/lib/api/safe-fallbacks";
import { assertSafeOutput, UnsafeOutputError } from "@/lib/safety/filter";
import { detectSafetyMode } from "@/lib/safety/policy";

export interface RoastRouteDependencies {
  generate(input: ProviderRoastInput): Promise<Generated>;
}

const productionDependencies: RoastRouteDependencies = {
  async generate(input) {
    const { routeRoastTraced } = await import("@/lib/ai/router");
    return routeRoastTraced(input);
  },
};

type FailureReason = "safety" | "invalid_response";

function validateGenerated(result: Generated, expectedSafetyMode: ProviderRoastInput["safetyMode"]) {
  try {
    const parsed = providerRoastResultSchema.parse(result.data);
    const data = { ...parsed, safetyMode: expectedSafetyMode };
    assertSafeOutput(data);
    return { data, provider: result.provider };
  } catch (error) {
    if (error instanceof UnsafeOutputError) throw error;
    throw new ProviderError("invalid_response", true, { cause: error });
  }
}

function outputReason(error: unknown): FailureReason | null {
  if (error instanceof UnsafeOutputError) return "safety";
  if (error instanceof ProviderError && error.kind === "invalid_response") return "invalid_response";
  return null;
}

export function createRoastHandler(dependencies: RoastRouteDependencies) {
  return async function handleRoast(request: Request): Promise<Response> {
    let raw: unknown;
    try { raw = await readBoundedJson(request); }
    catch (error) { return error instanceof RequestBodyError && error.status === 413 ? payloadTooLarge() : invalidRequest(); }
    if (isOversizedImage(raw)) return payloadTooLarge();
    const parsed = roastRequestSchema.safeParse(raw);
    if (!parsed.success) return invalidRequest();

    const input: ProviderRoastInput = { ...parsed.data, safetyMode: detectSafetyMode(parsed.data.text) };
    try {
      try {
        const result = validateGenerated(await dependencies.generate(input), input.safetyMode);
        return json({ data: result.data, meta: { provider: result.provider, degraded: false } });
      } catch (firstError) {
        const firstReason = outputReason(firstError);
        if (!firstReason) throw firstError;
        try {
          const result = validateGenerated(await dependencies.generate({ ...input, safetyMode: "gentle" }), "gentle");
          return json({ data: result.data, meta: { provider: result.provider, degraded: false } });
        } catch (secondError) {
          const secondReason = outputReason(secondError);
          if (!secondReason) throw secondError;
          return json({ data: safeRoastFallback(), meta: { provider: "mock", degraded: true, reason: secondReason } });
        }
      }
    } catch (error) {
      return providerFailure(error);
    }
  };
}

export const POST = createRoastHandler(productionDependencies);
