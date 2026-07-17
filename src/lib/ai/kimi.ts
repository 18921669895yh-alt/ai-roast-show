import "server-only";
import OpenAI from "openai";
import type { Provider, ProviderComebackInput, ProviderReportInput } from "./provider";
import { getProviderMaxTokens, ProviderError, normalizeProviderError, type ProviderOperation } from "./provider";
import { COMEBACK_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT, comebackUserPrompt, reportUserPrompt } from "./prompts";
import { TOXIC_ROAST_SYSTEM_PROMPT, toxicRoastUserPrompt } from "./toxic-prompts";

type Client = Pick<OpenAI, "chat">;
type ClientFactory = (options: { apiKey: string; baseURL: string; timeout: number }) => Client;

interface KimiOptions { apiKey?: string; baseURL?: string; model?: string; clientFactory?: ClientFactory }

const KIMI_TEXT_TIMEOUT_MS = 30_000;
const KIMI_IMAGE_TIMEOUT_MS = 90_000;

export function createKimiProvider(options: KimiOptions = {}): Provider {
  const apiKey = options.apiKey ?? process.env.MOONSHOT_API_KEY ?? "";
  const baseURL = options.baseURL ?? process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1";
  const model = options.model ?? process.env.KIMI_MODEL ?? "kimi-k2.6";
  const factory = options.clientFactory ?? ((config) => new OpenAI(config));
  let client: Client | undefined;

  async function request(operation: ProviderOperation, system: string, user: string, imageUrl?: string): Promise<unknown> {
    if (!apiKey) throw new ProviderError("auth", false);
    client ??= factory({ apiKey, baseURL, timeout: KIMI_IMAGE_TIMEOUT_MS });
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: "text", text: user }];
    if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } });
    try {
      const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
        thinking: { type: "disabled" };
      } = {
        model,
        messages: [{ role: "system", content: system }, { role: "user", content }],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: getProviderMaxTokens(operation),
      };
      const timeout = imageUrl ? KIMI_IMAGE_TIMEOUT_MS : KIMI_TEXT_TIMEOUT_MS;
      const response = await client.chat.completions.create(body, { signal: AbortSignal.timeout(timeout) });
      const raw = response.choices[0]?.message.content;
      if (!raw) throw new ProviderError("invalid_response", true);
      try { return JSON.parse(raw); } catch (error) { throw new ProviderError("invalid_response", true, { cause: error }); }
    } catch (error) { throw normalizeProviderError(error); }
  }

  return {
    roast(input) { return request("roast", TOXIC_ROAST_SYSTEM_PROMPT, toxicRoastUserPrompt(input), input.image?.dataUrl); },
    comeback(input: ProviderComebackInput) { return request("comeback", COMEBACK_SYSTEM_PROMPT, comebackUserPrompt(input)); },
    report(input: ProviderReportInput) { return request("report", REPORT_SYSTEM_PROMPT, reportUserPrompt(input)); },
  };
}

export const kimiProvider = createKimiProvider();
