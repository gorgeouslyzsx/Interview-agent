export type LLMClient = {
  complete(prompt: string): Promise<string>;
};

type LLMEnv = Record<string, string | undefined>;

export type LLMConfig = {
  apiKey?: string;
  baseUrl: string;
  endpoint: string;
  model: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function resolveLLMConfig(env: LLMEnv = process.env): LLMConfig {
  const baseUrl = normalizeBaseUrl(env.LLM_BASE_URL ?? "https://api.openai.com/v1");

  return {
    apiKey: env.GLM_API_KEY || env.OPENAI_API_KEY,
    baseUrl,
    endpoint: `${baseUrl}/chat/completions`,
    model: env.LLM_MODEL ?? "gpt-4.1-mini",
  };
}

export function createOpenAICompatibleClient(): LLMClient {
  return {
    async complete(prompt: string) {
      const config = resolveLLMConfig();
      if (!config.apiKey) {
        return "当前未配置 LLM API Key，已使用本地占位回复。请配置 GLM_API_KEY 或 OPENAI_API_KEY 后启用真实模型。";
      }

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        return "模型调用失败，请稍后重试。";
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? "模型没有返回内容。";
    },
  };
}
