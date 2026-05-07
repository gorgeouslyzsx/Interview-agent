import { describe, expect, it } from "vitest";
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
        complete: async (prompt) => `收到，我会开始提问。${prompt.includes("AI 扮演面试官")}`,
      },
    });

    expect(result.aiRole).toBe("interviewer");
    expect(result.content).toContain("true");
  });
});
