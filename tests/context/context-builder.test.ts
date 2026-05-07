import { describe, expect, it } from "vitest";
import { buildContextPacket } from "@/lib/context/context-builder";

describe("buildContextPacket", () => {
  it("creates stable and dynamic prompt sections", () => {
    const packet = buildContextPacket({
      userRole: "candidate",
      aiRole: "interviewer",
      style: "technical",
      difficulty: "medium",
      identityProfile: "Java 后端三年经验",
      memorySummary: "Redis 回答薄弱",
      jdSummary: "Java 后端，需要 Redis 和 MySQL",
      retrievedQuestions: ["Redis 缓存穿透怎么处理？"],
      recentMessages: ["用户刚回答了 Redis 基础概念"],
      latestUserMessage: "我准备好了",
    });

    expect(packet.cacheablePrefix).toContain("AI 扮演面试官");
    expect(packet.dynamicContext).toContain("Redis 回答薄弱");
    expect(packet.dynamicContext).toContain("Redis 缓存穿透");
  });
});
