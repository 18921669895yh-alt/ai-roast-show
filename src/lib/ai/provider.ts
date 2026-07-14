import { z } from "zod";
import { awardSchema, comedyMetricsSchema, observationSchema, roastResultSchema, ROAST_TEXT_LIMITS, type RoastLevel, type RoastMode } from "@/lib/domain/roast";

export interface ProviderImage {
  dataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
}

export interface ProviderRoastInput {
  text?: string;
  image?: ProviderImage;
  level: RoastLevel;
  mode: RoastMode;
  safetyMode: "standard" | "gentle";
}

export interface PriorTurn {
  userLine: string;
  reply: string;
}

export interface ProviderComebackInput {
  round: 1 | 2 | 3 | 4 | 5;
  userLine: string;
  priorTurns: PriorTurn[];
  roastContext: unknown;
  safetyMode: "standard" | "gentle";
  preferredProvider?: "deepseek" | "kimi";
}

export interface ProviderReportInput {
  roast: unknown;
  safetyMode?: "standard" | "gentle";
  preferredProvider?: "deepseek" | "kimi";
}

const score = z.number().int().min(0).max(100);
export const MAX_COMEBACK_REPLY_CHARS = 4_000;
export const comebackResultSchema = z.object({
  reply: z.string().trim().min(1).max(MAX_COMEBACK_REPLY_CHARS),
  wit: score,
  force: score,
  stubbornness: score,
  support: score,
}).strict();
export type ComebackResult = z.infer<typeof comebackResultSchema>;

const nonemptyString = z.string().trim().min(1);
export const reportResultSchema = z.object({
  comedyTags: z.array(nonemptyString.max(ROAST_TEXT_LIMITS.tag)).length(3),
  metrics: comedyMetricsSchema.strict(),
  award: awardSchema.strict(),
  bestJoke: nonemptyString.max(ROAST_TEXT_LIMITS.bestJoke),
  fictionalDisclaimer: nonemptyString.max(ROAST_TEXT_LIMITS.fictionalDisclaimer).refine((value) => value.includes("虚构"), {
    message: "Report must label comedy metrics as fictional",
  }),
}).strict();
export type ReportResult = z.infer<typeof reportResultSchema>;
export const providerRoastResultSchema = roastResultSchema.strict().safeExtend({
  observations: z.array(observationSchema.strict()).min(3).max(5),
  metrics: comedyMetricsSchema.strict(),
  award: awardSchema.strict(),
});

export type ProviderOperation = "roast" | "comeback" | "report";
const DEFAULT_MAX_TOKENS: Record<ProviderOperation, number> = { roast: 1800, comeback: 900, report: 900 };
const TOKEN_ENV: Record<ProviderOperation, string> = {
  roast: "AI_ROAST_MAX_TOKENS",
  comeback: "AI_COMEBACK_MAX_TOKENS",
  report: "AI_REPORT_MAX_TOKENS",
};

export function getProviderMaxTokens(operation: ProviderOperation): number {
  const parsed = Number(process.env[TOKEN_ENV[operation]]);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 8192 ? parsed : DEFAULT_MAX_TOKENS[operation];
}

export interface Provider {
  roast(input: ProviderRoastInput): Promise<unknown>;
  comeback(input: ProviderComebackInput): Promise<unknown>;
  report(input: ProviderReportInput): Promise<unknown>;
}

export interface ProviderSet {
  deepseek: Provider;
  kimi: Provider;
  mock: Provider;
}

export type ProviderErrorKind = "timeout" | "rate_limit" | "auth" | "invalid_response" | "upstream";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly retryable: boolean;

  constructor(kind: ProviderErrorKind, retryable: boolean, options?: { cause?: unknown }) {
    super(`AI provider failed: ${kind}`, options);
    this.name = "ProviderError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export function normalizeProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const name = error instanceof Error ? error.name : String(record.name ?? "");
  const code = String(record.code ?? "");
  if (["AbortError", "TimeoutError", "APIConnectionTimeoutError"].includes(name) || ["ETIMEDOUT", "ECONNABORTED"].includes(code)) {
    return new ProviderError("timeout", true, { cause: error });
  }
  const status = Number(record.status ?? 0);
  if (status === 408) return new ProviderError("timeout", true, { cause: error });
  if (status === 401 || status === 403) return new ProviderError("auth", false, { cause: error });
  if (status === 429) return new ProviderError("rate_limit", true, { cause: error });
  if (status >= 500 && status <= 599) return new ProviderError("upstream", true, { cause: error });
  if ([400, 404, 422].includes(status)) return new ProviderError("invalid_response", false, { cause: error });
  return new ProviderError("upstream", true, { cause: error });
}
