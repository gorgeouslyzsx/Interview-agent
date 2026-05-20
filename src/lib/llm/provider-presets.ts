export const LLM_PROVIDER_PRESETS = [
  {
    id: "glm",
    name: "GLM / 智谱",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-5.1", "glm-5", "glm-5-turbo", "glm-5v-turbo", "glm-4.7"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: [
      "deepseek-v4-pro",
      "deepseek-v4-pro:thinking-max",
      "deepseek-v4-pro:thinking-off",
      "deepseek-v4-flash",
      "deepseek-v4-flash:thinking-off",
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.2-pro"],
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["kimi-k2.6", "kimi-k2.6:thinking-off", "kimi-k2.5", "kimi-k2.5:thinking-off", "kimi-k2-thinking"],
  },
  {
    id: "minimax",
    name: "MiniMax",
    baseUrl: "https://api.minimax.io/v1",
    models: ["MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5", "MiniMax-M2.1", "MiniMax-M2"],
  },
  {
    id: "qwen",
    name: "Qwen / 通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen3.6-max-preview", "qwen3.6-plus", "qwen3.6-plus-2026-04-02", "qwen3-coder-next", "qwen3-coder-plus"],
  },
  {
    id: "gemini",
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-5.5", "openai/gpt-5.4", "z-ai/glm-5.1", "deepseek/deepseek-v4-pro", "moonshotai/kimi-k2.6"],
  },
] as const;

export type LLMProviderId = (typeof LLM_PROVIDER_PRESETS)[number]["id"];
