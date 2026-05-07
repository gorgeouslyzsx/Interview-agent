export type LLMClient = {
  complete(prompt: string): Promise<string>;
};

export function createOpenAICompatibleClient(): LLMClient {
  return {
    async complete(prompt: string) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return "当前未配置 OPENAI_API_KEY，已使用本地占位回复。请配置环境变量后启用真实模型。";
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
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
