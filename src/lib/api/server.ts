import { ProviderError, normalizeProviderError } from "@/lib/ai/provider";

export type ProviderName = "deepseek" | "kimi" | "mock";
export interface Generated<T = unknown> { data: T; provider: ProviderName }
export interface ResponseMeta { provider: ProviderName; degraded: boolean; reason?: "safety" | "invalid_response" }

const MAX_JSON_BYTES = 16 * 1024 * 1024;

export class RequestBodyError extends Error {
  constructor(readonly status: 400 | 413) { super("Invalid request body"); }
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const header = request.headers.get("content-length");
  if (header !== null) {
    if (!/^(?:0|[1-9]\d*)$/.test(header)) throw new RequestBodyError(400);
    const declared = Number(header);
    if (!Number.isSafeInteger(declared)) throw new RequestBodyError(400);
    if (declared > MAX_JSON_BYTES) {
      await request.body?.cancel().catch(() => undefined);
      throw new RequestBodyError(413);
    }
  }
  if (!request.body) throw new RequestBodyError(400);
  const reader = request.body.getReader();
  const PAGE_BYTES = 64 * 1024;
  const pages: Uint8Array[] = [];
  let total = 0;
  let pageOffset = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > MAX_JSON_BYTES - total) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyError(413);
      }
      total += value.byteLength;
      let sourceOffset = 0;
      while (sourceOffset < value.byteLength) {
        if (pages.length === 0 || pageOffset === PAGE_BYTES) {
          pages.push(new Uint8Array(PAGE_BYTES));
          pageOffset = 0;
        }
        const count = Math.min(PAGE_BYTES - pageOffset, value.byteLength - sourceOffset);
        pages.at(-1)?.set(value.subarray(sourceOffset, sourceOffset + count), pageOffset);
        pageOffset += count;
        sourceOffset += count;
      }
    }
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const page of pages) {
    const count = Math.min(page.byteLength, total - offset);
    bytes.set(page.subarray(0, count), offset);
    offset += count;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text);
  } catch { throw new RequestBodyError(400); }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function invalidRequest(): Response {
  return json({ code: "INVALID_REQUEST", message: "请求内容无效，请检查后重试。", retryable: false }, 400);
}

export function payloadTooLarge(): Response {
  return json({ code: "PAYLOAD_TOO_LARGE", message: "上传内容超过大小限制。", retryable: false }, 413);
}

export function providerFailure(error: unknown): Response {
  const normalized = error instanceof ProviderError ? error : normalizeProviderError(error);
  if (normalized.kind === "auth") {
    return json({ code: "AI_UNAVAILABLE", message: "AI 服务尚未配置或暂不可用。", retryable: false }, 503);
  }
  return json({ code: "SERVICE_UNAVAILABLE", message: "AI 服务暂时繁忙，请稍后重试。", retryable: true }, 503);
}

export function isOversizedImage(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const image = (value as Record<string, unknown>).image;
  if (typeof image !== "object" || image === null) return false;
  const record = image as Record<string, unknown>;
  if (typeof record.size === "number" && record.size > 10 * 1024 * 1024) return true;
  if (typeof record.dataUrl !== "string") return false;
  const comma = record.dataUrl.indexOf(",");
  if (comma < 0) return false;
  const offset = comma + 1;
  const payloadLength = record.dataUrl.length - offset;
  const padding = record.dataUrl.endsWith("==") ? 2 : record.dataUrl.endsWith("=") ? 1 : 0;
  return Math.floor(payloadLength / 4) * 3 - padding > 10 * 1024 * 1024;
}
