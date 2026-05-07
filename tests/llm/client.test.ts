import { describe, expect, it } from "vitest";
import { resolveLLMConfig } from "@/lib/llm/client";

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
});
