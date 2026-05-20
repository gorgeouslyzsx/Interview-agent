import { describe, expect, it } from "vitest";
import { buildLLMRequestBody, createOpenAICompatibleClient, extractLLMUsage, resolveLLMConfig } from "@/lib/llm/client";

describe("resolveLLMConfig", () => {
  it("uses GLM-compatible environment variables when provided", () => {
    const config = resolveLLMConfig({
      GLM_API_KEY: "glm-secret",
      LLM_BASE_URL: "https://open.bigmodel.cn/api/paas/v4/",
      LLM_MODEL: "glm-5",
    });

    expect(config.apiKey).toBe("glm-secret");
    expect(config.baseUrl).toBe("https://open.bigmodel.cn/api/paas/v4");
    expect(config.endpoint).toBe("https://open.bigmodel.cn/api/paas/v4/chat/completions");
    expect(config.model).toBe("glm-5");
  });

  it("falls back to OpenAI-compatible defaults", () => {
    const config = resolveLLMConfig({
      OPENAI_API_KEY: "openai-secret",
    });

    expect(config.apiKey).toBe("openai-secret");
    expect(config.endpoint).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("allows identity-level model config to override environment defaults", () => {
    const config = resolveLLMConfig(
      {
        GLM_API_KEY: "env-secret",
        LLM_BASE_URL: "https://open.bigmodel.cn/api/paas/v4",
        LLM_MODEL: "glm-5",
      },
      {
        apiKey: "identity-secret",
        baseUrl: "https://api.deepseek.com",
        model: "deepseek-v4-pro",
      },
    );

    expect(config.apiKey).toBe("identity-secret");
    expect(config.baseUrl).toBe("https://api.deepseek.com");
    expect(config.endpoint).toBe("https://api.deepseek.com/chat/completions");
    expect(config.model).toBe("deepseek-v4-pro");
  });

  it("ignores unsafe identity-level base URLs and falls back to environment defaults", () => {
    const config = resolveLLMConfig(
      {
        OPENAI_API_KEY: "openai-secret",
        LLM_BASE_URL: "https://api.openai.com/v1",
        LLM_MODEL: "gpt-5.4-mini",
      },
      {
        apiKey: "identity-secret",
        baseUrl: "http://127.0.0.1:11434/v1",
        model: "gpt-5.4",
      },
    );

    expect(config.baseUrl).toBe("https://api.openai.com/v1");
    expect(config.endpoint).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("extracts cached token usage from GLM-compatible responses", () => {
    const usage = extractLLMUsage({
      prompt_tokens: 1200,
      completion_tokens: 300,
      total_tokens: 1500,
      prompt_tokens_details: {
        cached_tokens: 800,
      },
    });

    expect(usage).toEqual({
      promptTokens: 1200,
      completionTokens: 300,
      totalTokens: 1500,
      cachedTokens: 800,
      cacheHitRate: 800 / 1200,
      estimatedSavedPromptTokens: 400,
    });
  });
});

describe("buildLLMRequestBody", () => {
  it("strips DeepSeek thinking suffixes before sending the model id", () => {
    expect(buildLLMRequestBody("deepseek-v4-pro:thinking-max", [{ role: "user", content: "hello" }])).toEqual({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "hello" }],
      thinking: { type: "enabled" },
      reasoning_effort: "max",
    });
  });

  it("strips Kimi thinking suffixes before sending the model id", () => {
    expect(buildLLMRequestBody("kimi-k2.6:thinking-off", [{ role: "user", content: "hello" }])).toEqual({
      model: "kimi-k2.6",
      messages: [{ role: "user", content: "hello" }],
      thinking: { type: "disabled" },
    });
  });
});

describe("createOpenAICompatibleClient", () => {
  it("returns a safe failure message instead of throwing when fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("network down");
    };

    try {
      const result = await createOpenAICompatibleClient({
        apiKey: "test-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-5.4-mini",
      }).completeWithUsage([{ role: "user", content: "hello" }]);

      expect(result.content).toContain("模型调用失败");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
