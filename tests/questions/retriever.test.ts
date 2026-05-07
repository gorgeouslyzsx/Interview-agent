import { describe, expect, it } from "vitest";
import { retrieveQuestions } from "@/lib/questions/retriever";

describe("retrieveQuestions", () => {
  it("prefers JD skills and matching difficulty", () => {
    const result = retrieveQuestions({
      jdSkills: ["Java", "Redis"],
      difficulty: "medium",
      weakPoints: ["Redis"],
      limit: 2,
      questions: [
        {
          id: "q1",
          userId: "u1",
          question: "Redis 缓存穿透怎么处理？",
          skillTags: ["Redis"],
          difficulty: "medium",
          type: "technical",
          referenceAnswer: "布隆过滤器和空值缓存",
          evaluationPoints: ["缓存穿透", "布隆过滤器"],
          createdAt: "2026-05-08T00:00:00.000Z",
        },
        {
          id: "q2",
          userId: "u1",
          question: "CSS 盒模型是什么？",
          skillTags: ["CSS"],
          difficulty: "easy",
          type: "technical",
          evaluationPoints: ["盒模型"],
          createdAt: "2026-05-08T00:00:00.000Z",
        },
      ],
    });

    expect(result[0].id).toBe("q1");
  });
});
