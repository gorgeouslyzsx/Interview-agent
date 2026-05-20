import { resolveSafeLLMBaseUrl } from "@/lib/security/identity-access";

export type LLMClient = {
  complete(prompt: string | LLMMessage[]): Promise<string>;
  completeWithUsage(prompt: string | LLMMessage[]): Promise<LLMCompletionResult>;
};

type LLMEnv = Record<string, string | undefined>;

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMConfig = {
  apiKey?: string;
  baseUrl: string;
  endpoint: string;
  model: string;
};

export type LLMConfigOverrides = {
  apiKey?: string | null;
  baseUrl?: string | null;
  model?: string | null;
};

export type LLMUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
  cacheHitRate: number;
  estimatedSavedPromptTokens: number;
};

export type LLMCompletionResult = {
  content: string;
  usage?: LLMUsage;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

type LLMRequestBody = {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  thinking?: { type: "enabled" | "disabled" };
  reasoning_effort?: "low" | "medium" | "high" | "max";
};

function resolveModelSelection(modelSelection: string): Pick<LLMRequestBody, "model" | "thinking" | "reasoning_effort"> {
  const [model, mode] = modelSelection.split(":");

  if (mode === "thinking-max") {
    return {
      model,
      thinking: { type: "enabled" },
      reasoning_effort: "max",
    };
  }

  if (mode === "thinking-off") {
    return {
      model,
      thinking: { type: "disabled" },
    };
  }

  return { model: modelSelection };
}

export function buildLLMRequestBody(modelSelection: string, messages: LLMMessage[]): LLMRequestBody {
  const selection = resolveModelSelection(modelSelection);
  const isProviderFixedTemperatureModel = selection.model.startsWith("kimi-") || selection.model.startsWith("deepseek-v4-");

  return {
    ...selection,
    messages,
    ...(isProviderFixedTemperatureModel ? {} : { temperature: 0.4 }),
  };
}

export function resolveLLMConfig(env: LLMEnv = process.env, overrides: LLMConfigOverrides = {}): LLMConfig {
  const envBaseUrl = normalizeBaseUrl(env.LLM_BASE_URL || "https://api.openai.com/v1");
  const baseUrl = normalizeBaseUrl(
    overrides.baseUrl ? resolveSafeLLMBaseUrl(overrides.baseUrl, envBaseUrl) : envBaseUrl,
  );

  return {
    apiKey: overrides.apiKey || env.GLM_API_KEY || env.OPENAI_API_KEY,
    baseUrl,
    endpoint: `${baseUrl}/chat/completions`,
    model: overrides.model || env.LLM_MODEL || "gpt-5.4-mini",
  };
}

type RawUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
};

export function extractLLMUsage(rawUsage: RawUsage | undefined): LLMUsage | undefined {
  if (!rawUsage) return undefined;

  const promptTokens = rawUsage.prompt_tokens ?? 0;
  const completionTokens = rawUsage.completion_tokens ?? 0;
  const totalTokens = rawUsage.total_tokens ?? promptTokens + completionTokens;
  const cachedTokens = rawUsage.prompt_tokens_details?.cached_tokens ?? 0;

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cachedTokens,
    cacheHitRate: promptTokens > 0 ? cachedTokens / promptTokens : 0,
    estimatedSavedPromptTokens: Math.round(cachedTokens * 0.5),
  };
}

function toMessages(prompt: string | LLMMessage[]): LLMMessage[] {
  return typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;
}

async function postCompletion(config: LLMConfig, messages: LLMMessage[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    return await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildLLMRequestBody(config.model, messages)),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function createOpenAICompatibleClient(overrides: LLMConfigOverrides = {}): LLMClient {
  return {
    async complete(prompt: string | LLMMessage[]) {
      const result = await this.completeWithUsage(prompt);
      return result.content;
    },
    async completeWithUsage(prompt: string | LLMMessage[]) {
      const config = resolveLLMConfig(process.env, overrides);
      if (!config.apiKey) {
        return {
          content: "当前未配置 LLM API Key，已使用本地占位回复。请配置 GLM_API_KEY 或 OPENAI_API_KEY 后启用真实模型。",
        };
      }

      const messages = toMessages(prompt);
      let response: Response | undefined;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await postCompletion(config, messages);
          if (response.ok || response.status < 500) break;
        } catch {
          if (attempt === 1) {
            return { content: "模型调用失败，请稍后重试。" };
          }
        }
      }

      if (!response?.ok) {
        return { content: "模型调用失败，请稍后重试。" };
      }

      try {
        const data = await response.json();
        return {
          content: data.choices?.[0]?.message?.content ?? "模型没有返回内容。",
          usage: extractLLMUsage(data.usage),
        };
      } catch {
        return { content: "模型返回格式异常，请稍后重试。" };
      }
    },
  };
}
