import { describe, expect, it } from "vitest";
import { readBoundedJson, RequestBodyError } from "./server";

function streamedRequest(chunks: Uint8Array[], onCancel?: () => void, headers?: HeadersInit): Request {
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === chunks.length) controller.close();
      else controller.enqueue(chunks[index++]);
    },
    cancel() { onCancel?.(); },
  });
  return new Request("http://localhost/api/test", { method: "POST", body, headers, duplex: "half" } as RequestInit & { duplex: "half" });
}

describe("readBoundedJson", () => {
  it("parses chunked JSON without Content-Length", async () => {
    const encoder = new TextEncoder();
    await expect(readBoundedJson(streamedRequest([encoder.encode('{"ok":'), encoder.encode("true}")]))).resolves.toEqual({ ok: true });
  });

  it("accepts exactly 16 MiB and cancels immediately above it", async () => {
    const limit = 16 * 1024 * 1024;
    const prefix = new TextEncoder().encode("{} ");
    await expect(readBoundedJson(streamedRequest([prefix, new Uint8Array(limit - prefix.length).fill(32)]))).resolves.toEqual({});
    let cancelled = false;
    const chunks = Array.from({ length: 17 }, () => new Uint8Array(1024 * 1024).fill(32));
    await expect(readBoundedJson(streamedRequest(chunks, () => { cancelled = true; }))).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });

  it.each(["-1", "abc", "1, 2"])("rejects malformed Content-Length %s", async (length) => {
    await expect(readBoundedJson(streamedRequest([new TextEncoder().encode("{}")], undefined, { "content-length": length }))).rejects.toBeInstanceOf(RequestBodyError);
  });

  it("rejects an oversized declared length before reading", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    const request = new Request("http://localhost", { method: "POST", body, headers: { "content-length": String(16 * 1024 * 1024 + 1) }, duplex: "half" } as RequestInit & { duplex: "half" });
    await expect(readBoundedJson(request)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });

  it("keeps 413 semantics when stream cancellation itself fails", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(16 * 1024 * 1024 + 1)); },
      cancel() { throw new Error("cancel failure"); },
    });
    const request = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit & { duplex: "half" });
    await expect(readBoundedJson(request)).rejects.toMatchObject({ status: 413 });
  });

  it("coalesces many tiny reused chunks without retaining each view", async () => {
    const source = new TextEncoder().encode(`{}${" ".repeat(100_000)}`);
    const reused = new Uint8Array(1);
    let index = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index === source.length) return controller.close();
        reused[0] = source[index++];
        controller.enqueue(reused);
      },
    });
    const request = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit & { duplex: "half" });
    await expect(readBoundedJson(request)).resolves.toEqual({});
  });
});
