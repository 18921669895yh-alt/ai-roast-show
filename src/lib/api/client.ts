export type ApiMeta = { provider?: "deepseek" | "kimi" | "mock"; degraded: boolean; reason?: string };
export type ApiEnvelope<T> = { data: T; meta: ApiMeta };

export class ApiClientError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ApiClientError";
    this.retryable = retryable;
  }
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (!("data" in record) || !record.meta || typeof record.meta !== "object" || Array.isArray(record.meta)) return false;
  const meta = record.meta as Record<string, unknown>;
  const providerValid = meta.provider === undefined || meta.provider === "deepseek" || meta.provider === "kimi" || meta.provider === "mock";
  const reasonValid = meta.reason === undefined || meta.reason === "safety" || meta.reason === "invalid_response";
  return typeof meta.degraded === "boolean" && providerValid && reasonValid;
}

export async function postJson<T>(url: string, body: unknown, options: { signal?: AbortSignal; fetcher?: typeof fetch } = {}): Promise<ApiEnvelope<T>> {
  const fetcher = options.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError("现场信号不稳，请稍后重试。", true);
  }
  if (!response.ok) throw new ApiClientError("现场信号不稳，请稍后重试。", response.status >= 500);
  try {
    const value: unknown = await response.json();
    if (!isEnvelope(value)) throw new Error("invalid envelope");
    return value as ApiEnvelope<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError("现场信号不稳，请稍后重试。", true);
  }
}
