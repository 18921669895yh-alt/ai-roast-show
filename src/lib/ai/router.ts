import type { RoastResult } from "@/lib/domain/roast";
import { comebackResultSchema, ProviderError, providerRoastResultSchema, reportResultSchema, normalizeProviderError, type ComebackResult, type Provider, type ProviderComebackInput, type ProviderReportInput, type ProviderRoastInput, type ProviderSet, type ReportResult } from "./provider";
import { deepSeekProvider } from "./deepseek";
import { kimiProvider } from "./kimi";
import { mockProvider } from "./mock";

export interface RouterConfig {
  mockMode?: boolean;
  deepseekConfigured?: boolean;
  kimiConfigured?: boolean;
  allowImageMockFallback?: boolean;
}

const defaultProviders: ProviderSet = { deepseek: deepSeekProvider, kimi: kimiProvider, mock: mockProvider };
function config(value: RouterConfig): Required<RouterConfig> {
  return {
    mockMode: value.mockMode ?? process.env.AI_MOCK_MODE === "true",
    deepseekConfigured: value.deepseekConfigured ?? Boolean(process.env.DEEPSEEK_API_KEY),
    kimiConfigured: value.kimiConfigured ?? Boolean(process.env.MOONSHOT_API_KEY),
      allowImageMockFallback: value.allowImageMockFallback ?? false,
  };
}

async function validated<T>(operation: () => Promise<unknown>, parse: (value: unknown) => T): Promise<T> {
  try {
    const value = await operation();
    try { return parse(value); } catch (error) { throw new ProviderError("invalid_response", true, { cause: error }); }
  } catch (error) { throw normalizeProviderError(error); }
}

export type RoutedProviderName = "deepseek" | "kimi" | "mock";
export interface RoutedResult<T> { data: T; provider: RoutedProviderName }

async function roastWith(provider: Provider, input: ProviderRoastInput): Promise<RoastResult> {
  return validated(() => provider.roast(input), (value) => providerRoastResultSchema.parse(value));
}

async function tracedRoast(provider: RoutedProviderName, implementation: Provider, input: ProviderRoastInput): Promise<RoutedResult<RoastResult>> {
  return { data: await roastWith(implementation, input), provider };
}

export async function routeRoastTraced(input: ProviderRoastInput, providers = defaultProviders, value: RouterConfig = {}): Promise<RoutedResult<RoastResult>> {
  const cfg = config(value);
  if (cfg.mockMode) return tracedRoast("mock", providers.mock, input);
  if (input.image) {
    if (!cfg.kimiConfigured) {
      return tracedRoast("mock", providers.mock, input);
    }
    try { return await tracedRoast("kimi", providers.kimi, input); }
    catch (error) {
      if (cfg.allowImageMockFallback) return tracedRoast("mock", providers.mock, input);
      throw error;
    }
  }
  if (!cfg.deepseekConfigured) {
    if (cfg.kimiConfigured) return tracedRoast("kimi", providers.kimi, input);
    return tracedRoast("mock", providers.mock, input);
  }
  try { return await tracedRoast("deepseek", providers.deepseek, input); }
  catch (error) {
    const normalized = normalizeProviderError(error);
    if (normalized.retryable && cfg.kimiConfigured) return tracedRoast("kimi", providers.kimi, input);
    throw normalized;
  }
}

export async function routeRoast(input: ProviderRoastInput, providers = defaultProviders, value: RouterConfig = {}): Promise<RoastResult> {
  return (await routeRoastTraced(input, providers, value)).data;
}

function order(preferred?: "deepseek" | "kimi"): ("deepseek" | "kimi")[] {
  return preferred === "kimi" ? ["kimi", "deepseek"] : ["deepseek", "kimi"];
}

async function routeStructured<T>(method: "comeback" | "report", input: ProviderComebackInput | ProviderReportInput, providers: ProviderSet, value: RouterConfig, parse: (value: unknown) => T): Promise<RoutedResult<T>> {
  const cfg = config(value);
  if (cfg.mockMode) return { data: await validated(() => providers.mock[method](input as never), parse), provider: "mock" };
  let last: ProviderError | undefined;
  for (const name of order(input.preferredProvider)) {
    if (!cfg[`${name}Configured`]) continue;
    try { return { data: await validated(() => providers[name][method](input as never), parse), provider: name }; }
    catch (error) {
      last = normalizeProviderError(error);
      if (!last.retryable) throw last;
    }
  }
  if (!last) return { data: await validated(() => providers.mock[method](input as never), parse), provider: "mock" };
  throw last;
}

export function routeComeback(input: ProviderComebackInput, providers = defaultProviders, value: RouterConfig = {}): Promise<ComebackResult> {
  return routeComebackTraced(input, providers, value).then((result) => result.data);
}

export function routeReport(input: ProviderReportInput, providers = defaultProviders, value: RouterConfig = {}): Promise<ReportResult> {
  return routeReportTraced(input, providers, value).then((result) => result.data);
}

export function routeComebackTraced(input: ProviderComebackInput, providers = defaultProviders, value: RouterConfig = {}): Promise<RoutedResult<ComebackResult>> {
  return routeStructured("comeback", input, providers, value, (result) => comebackResultSchema.parse(result));
}

export function routeReportTraced(input: ProviderReportInput, providers = defaultProviders, value: RouterConfig = {}): Promise<RoutedResult<ReportResult>> {
  return routeStructured("report", input, providers, value, (result) => reportResultSchema.parse(result));
}
