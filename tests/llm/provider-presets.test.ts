import { describe, expect, it } from "vitest";
import { LLM_PROVIDER_PRESETS } from "@/lib/llm/provider-presets";

describe("LLM_PROVIDER_PRESETS", () => {
  it("offers mainstream frontier providers on the identity creation form", () => {
    expect(LLM_PROVIDER_PRESETS.map((provider) => provider.id)).toEqual([
      "glm",
      "deepseek",
      "openai",
      "moonshot",
      "minimax",
      "qwen",
      "gemini",
      "openrouter",
    ]);
  });

  it("keeps at least five current model choices per provider", () => {
    for (const provider of LLM_PROVIDER_PRESETS) {
      expect(provider.models, provider.name).toHaveLength(5);
    }
  });

  it("defaults every provider to its newest flagship model", () => {
    expect(Object.fromEntries(LLM_PROVIDER_PRESETS.map((provider) => [provider.id, provider.models[0]]))).toMatchObject({
      glm: "glm-5.1",
      deepseek: "deepseek-v4-pro",
      openai: "gpt-5.5",
      moonshot: "kimi-k2.6",
      minimax: "MiniMax-M2.7",
      qwen: "qwen3.6-max-preview",
      gemini: "gemini-3-pro-preview",
      openrouter: "openai/gpt-5.5",
    });
  });

  it("does not expose older default-era models in regular identity choices", () => {
    const selectableModels = LLM_PROVIDER_PRESETS.flatMap((provider) => provider.models);

    expect(selectableModels).not.toContain("gpt-4.1-mini");
    expect(selectableModels).not.toContain("gpt-4o-mini");
    expect(selectableModels).not.toContain("glm-4.5");
    expect(selectableModels).not.toContain("deepseek-chat");
    expect(selectableModels).not.toContain("deepseek-reasoner");
  });
});
