import "server-only";
import OpenAI from "openai";
import type { Provider, ProviderComebackInput, ProviderReportInput, ProviderRoastInput } from "./provider";
import { getProviderMaxTokens, ProviderError, normalizeProviderError, type ProviderOperation } from "./provider";
import { COMEBACK_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT, comebackUserPrompt, reportUserPrompt } from "./prompts";
import { TOXIC_ROAST_SYSTEM_PROMPT, toxicRoastUserPrompt } from "./toxic-prompts";

type Client = Pick<OpenAI, "chat">;
type ClientFactory = (options: { apiKey: string; baseURL: string; timeout: number }) => Client;

interface DeepSeekOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  clientFactory?: ClientFactory;
}

export function createDeepSeekProvider(options: DeepSeekOptions = {}): Provider {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
  const baseURL = options.baseURL ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  const factory = options.clientFactory ?? ((config) => new OpenAI(config));
  let client: Client | undefined;

  async function request(operation: ProviderOperation, system: string, user: string): Promise<unknown> {
    if (!apiKey) throw new ProviderError("auth", false);
    client ??= factory({ apiKey, baseURL, timeout: 30_000 });
    try {
      const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
        thinking: { type: "disabled" };
      } = {
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: getProviderMaxTokens(operation),
      };
      const response = await client.chat.completions.create(body, { signal: AbortSignal.timeout(30_000) });
      const content = response.choices[0]?.message.content;
      if (!content) throw new ProviderError("invalid_response", true);
      try { return JSON.parse(content); } catch (error) { throw new ProviderError("invalid_response", true, { cause: error }); }
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  return {
    roast(input: ProviderRoastInput) {
      if (input.image) return Promise.reject(new ProviderError("invalid_response", false));
      return request("roast", TOXIC_ROAST_SYSTEM_PROMPT, toxicRoastUserPrompt(input));
    },
    comeback(input: ProviderComebackInput) { return request("comeback", COMEBACK_SYSTEM_PROMPT, comebackUserPrompt(input)); },
    report(input: ProviderReportInput) { return request("report", REPORT_SYSTEM_PROMPT, reportUserPrompt(input)); },
  };
}

export const deepSeekProvider = createDeepSeekProvider();
