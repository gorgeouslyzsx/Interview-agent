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

  it("uses query text and evaluation points when tags are sparse", () => {
    const result = retrieveQuestions({
      jdSkills: ["React"],
      difficulty: "medium",
      queryText: "前端性能优化 虚拟列表 首屏渲染",
      limit: 1,
      questions: [
        {
          id: "frontend-performance",
          userId: "u1",
          question: "如何优化 React 大列表的渲染性能？",
          skillTags: [],
          difficulty: "medium",
          type: "technical",
          evaluationPoints: ["虚拟列表", "memo", "首屏渲染"],
          createdAt: "2026-05-08T00:00:00.000Z",
        },
        {
          id: "backend-cache",
          userId: "u1",
          question: "Redis 缓存穿透怎么处理？",
          skillTags: ["Redis"],
          difficulty: "medium",
          evaluationPoints: ["缓存空值"],
          type: "technical",
          createdAt: "2026-05-08T00:00:00.000Z",
        },
      ],
    });

    expect(result[0].id).toBe("frontend-performance");
  });
});
