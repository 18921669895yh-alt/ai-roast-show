import { describe, expect, it, vi } from "vitest";
import { ApiClientError, postJson } from "./client";

describe("postJson", () => {
  it("passes AbortSignal and returns a valid envelope", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true }, meta: { degraded: false } }), { status: 200 }));
    await expect(postJson("/api/test", { hello: "world" }, { signal: controller.signal, fetcher })).resolves.toEqual({ data: { ok: true }, meta: { degraded: false } });
    expect(fetcher).toHaveBeenCalledWith("/api/test", expect.objectContaining({ signal: controller.signal }));
  });

  it("normalizes failures without leaking raw server content", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("SECRET raw prompt data:image/png;base64,AAAA", { status: 500 }));
    await expect(postJson("/api/test", {}, { fetcher })).rejects.toEqual(expect.objectContaining({ message: "现场信号不稳，请稍后重试。", retryable: true }));
    try { await postJson("/api/test", {}, { fetcher }); } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect(JSON.stringify(error)).not.toMatch(/SECRET|raw prompt|data:image/);
    }
  });

  it.each([
    [{ data: { ok: true } }, "missing meta"],
    [{ data: { ok: true }, meta: { degraded: "no" } }, "malformed meta"],
    [{ data: { ok: true }, meta: { degraded: false, provider: "rogue" } }, "unknown provider"],
  ])("rejects malformed success envelopes: %s", async (body) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    await expect(postJson("/api/test", {}, { fetcher })).rejects.toMatchObject({ message: "现场信号不稳，请稍后重试。", retryable: true });
  });

  it("marks 4xx failures as non-retryable", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    await expect(postJson("/api/test", {}, { fetcher })).rejects.toMatchObject({ retryable: false });
  });

  it("normalizes network rejection", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("SECRET network details"));
    await expect(postJson("/api/test", {}, { fetcher })).rejects.toEqual(expect.objectContaining({ message: "现场信号不稳，请稍后重试。", retryable: true }));
  });

  it("preserves AbortError identity", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const fetcher = vi.fn().mockRejectedValue(abort);
    await expect(postJson("/api/test", {}, { fetcher })).rejects.toBe(abort);
  });

  it("preserves AbortError identity while consuming the response body", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    const response = { ok: true, status: 200, json: vi.fn().mockRejectedValue(abort) } as unknown as Response;
    const fetcher = vi.fn().mockResolvedValue(response);
    await expect(postJson("/api/test", {}, { fetcher })).rejects.toBe(abort);
  });
});
