import { describe, expect, it, vi } from "vitest";
import { createInterviewTurn } from "@/lib/interview/orchestrator";

describe("createInterviewTurn", () => {
  it("uses interviewer role when user is candidate", async () => {
    const result = await createInterviewTurn({
      userRole: "candidate",
      identityProfile: "Java 后端三年",
      memorySummary: "Redis 薄弱",
      jdSummary: "需要 Redis",
      retrievedQuestions: ["Redis 缓存穿透怎么处理？"],
      recentMessages: [],
      latestUserMessage: "开始面试",
      llm: {
        complete: async (prompt) => `收到，我会开始提问。${JSON.stringify(prompt).includes("AI 扮演面试官")}`,
        completeWithUsage: async (messages) => ({
          content: `收到，我会开始提问。${JSON.stringify(messages).includes("AI 扮演面试官")}`,
          usage: {
            promptTokens: 100,
            completionTokens: 20,
            totalTokens: 120,
            cachedTokens: 60,
            cacheHitRate: 0.6,
            estimatedSavedPromptTokens: 48,
          },
        }),
      },
    });

    expect(result.aiRole).toBe("interviewer");
    expect(result.content).toContain("true");
    expect(result.usage?.cachedTokens).toBe(60);
  });

  it("passes compact initial and next-step plans into the model messages", async () => {
    let sentMessages = "";
    await createInterviewTurn({
      userRole: "candidate",
      identityProfile: "AI 应用工程候选人",
      memorySummary: "TTL 策略薄弱",
      jdSummary: "需要 Agent Memory",
      retrievedQuestions: ["Agent Memory 如何设计？"],
      recentMessages: [],
      latestUserMessage: "Redis 存短期上下文",
      initialPlanContext: "Initial Interview Plan：stage_02 Agent Memory 深挖",
      nextStepPlanContext: "NextStep Plan：decision=follow_up; question=请说明 TTL 策略",
      llm: {
        complete: async () => "",
        completeWithUsage: async (messages) => {
          sentMessages = JSON.stringify(messages);
          return { content: "请说明 TTL 策略" };
        },
      },
    });

    expect(sentMessages).toContain("Initial Interview Plan");
    expect(sentMessages).toContain("NextStep Plan");
    expect(sentMessages).toContain("必须服从服务端提供的 NextStep Plan");
  });

  it("returns a fallback response when the assistant LLM call is slow", async () => {
    vi.useFakeTimers();
    try {
      const turnPromise = createInterviewTurn({
        userRole: "candidate",
        identityProfile: "Java 后端三年",
        memorySummary: "Redis 薄弱",
        jdSummary: "需要 Redis",
        retrievedQuestions: ["Redis 缓存穿透怎么处理？"],
        recentMessages: [],
        latestUserMessage: "我用 Redis 存短期状态",
        nextStepPlanContext: "NextStep Plan：decision=follow_up; question=请说明 Redis key 和 TTL 怎么设计",
        assistantFallbackContent: "请说明 Redis key 和 TTL 怎么设计",
        llmTimeoutMs: 1000,
        llm: {
          complete: () => new Promise<string>(() => undefined),
          completeWithUsage: () => new Promise(() => undefined),
        },
      } as Parameters<typeof createInterviewTurn>[0] & {
        assistantFallbackContent: string;
        llmTimeoutMs: number;
      });
      let settled = false;
      turnPromise.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();

      expect(settled).toBe(true);
      await expect(turnPromise).resolves.toMatchObject({
        aiRole: "interviewer",
        content: "请说明 Redis key 和 TTL 怎么设计",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
