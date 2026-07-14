import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDeepSeekProvider } from "./deepseek";
import { createKimiProvider } from "./kimi";

const input = { text: "测试材料", level: "familiar", mode: "chat", safetyMode: "standard" } as const;

function fakeClient(response: unknown) {
  const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(response) } }] });
  return { client: { chat: { completions: { create } } }, create };
}

describe("DeepSeek adapter", () => {
  it("uses configured base URL/model and requests JSON without exposing a live network", async () => {
    const { client, create } = fakeClient({ ok: true });
    const factory = vi.fn().mockReturnValue(client);
    const provider = createDeepSeekProvider({ apiKey: "secret", baseURL: "https://deep.example/v1", model: "deep-model", clientFactory: factory });
    await provider.roast(input);
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "secret", baseURL: "https://deep.example/v1" }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "deep-model", response_format: { type: "json_object" }, thinking: { type: "disabled" }, max_tokens: 1800 }), expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(create.mock.calls[0][0]).not.toHaveProperty("extra_body");
  });

  it("uses the required defaults and an exact 30 second request timeout", async () => {
    const { client, create } = fakeClient({ ok: true });
    const factory = vi.fn().mockReturnValue(client);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const provider = createDeepSeekProvider({ apiKey: "secret", clientFactory: factory });
    await provider.roast(input);
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ baseURL: "https://api.deepseek.com", timeout: 30_000 }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "deepseek-v4-flash" }), expect.anything());
    expect(timeout).toHaveBeenCalledWith(30_000);
    timeout.mockRestore();
  });

  it("applies bounded environment token budgets to every contract", async () => {
    vi.stubEnv("AI_ROAST_MAX_TOKENS", "2000");
    vi.stubEnv("AI_COMEBACK_MAX_TOKENS", "700");
    vi.stubEnv("AI_REPORT_MAX_TOKENS", "800");
    const { client, create } = fakeClient({ ok: true });
    const provider = createDeepSeekProvider({ apiKey: "secret", clientFactory: () => client });
    await provider.roast(input);
    await provider.comeback({ round: 1, userLine: "不服", priorTurns: [], roastContext: {} });
    await provider.report({ roast: {} });
    expect(create.mock.calls.map(([body]) => body.max_tokens)).toEqual([2000, 700, 800]);
    vi.unstubAllEnvs();
  });

  it("rejects image input before calling DeepSeek", async () => {
    const { client, create } = fakeClient({});
    const provider = createDeepSeekProvider({ apiKey: "secret", clientFactory: () => client });
    await expect(provider.roast({ ...input, image: { dataUrl: "data:image/png;base64,AA==", mimeType: "image/png", size: 1 } })).rejects.toMatchObject({ kind: "invalid_response", retryable: false });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("Kimi adapter", () => {
  it("uses Moonshot configuration and sends image data as multimodal content", async () => {
    const { client, create } = fakeClient({ ok: true });
    const factory = vi.fn().mockReturnValue(client);
    const provider = createKimiProvider({ apiKey: "moon-secret", baseURL: "https://moon.example/v1", model: "kimi-model", clientFactory: factory });
    const image = { dataUrl: "data:image/png;base64,AA==", mimeType: "image/png", size: 1 } as const;
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await provider.roast({ ...input, image });
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "moon-secret", baseURL: "https://moon.example/v1" }));
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("kimi-model");
    expect(request.thinking).toEqual({ type: "disabled" });
    expect(request).not.toHaveProperty("extra_body");
    expect(request.messages[1].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "text" }),
      { type: "image_url", image_url: { url: image.dataUrl } },
    ]));
    expect(timeout).toHaveBeenCalledWith(90_000);
    timeout.mockRestore();
  });

  it("uses the required defaults and an exact 30 second request timeout", async () => {
    const { client, create } = fakeClient({ ok: true });
    const factory = vi.fn().mockReturnValue(client);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const provider = createKimiProvider({ apiKey: "secret", clientFactory: factory });
    await provider.roast(input);
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ baseURL: "https://api.moonshot.ai/v1", timeout: 90_000 }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "kimi-k2.6" }), expect.anything());
    expect(timeout).toHaveBeenCalledWith(30_000);
    timeout.mockRestore();
  });

  it("uses default per-contract token budgets and rejects unbounded env values", async () => {
    vi.stubEnv("AI_ROAST_MAX_TOKENS", "999999");
    vi.stubEnv("AI_COMEBACK_MAX_TOKENS", "-1");
    vi.stubEnv("AI_REPORT_MAX_TOKENS", "not-a-number");
    const { client, create } = fakeClient({ ok: true });
    const provider = createKimiProvider({ apiKey: "secret", clientFactory: () => client });
    await provider.roast(input);
    await provider.comeback({ round: 1, userLine: "不服", priorTurns: [], roastContext: {} });
    await provider.report({ roast: {} });
    expect(create.mock.calls.map(([body]) => body.max_tokens)).toEqual([1800, 900, 900]);
    vi.unstubAllEnvs();
  });
});
