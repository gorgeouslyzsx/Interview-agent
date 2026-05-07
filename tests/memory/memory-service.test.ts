import { describe, expect, it } from "vitest";
import { mergeMemorySummary } from "@/lib/memory/memory-service";

describe("mergeMemorySummary", () => {
  it("merges old memory with new report signals", () => {
    const merged = mergeMemorySummary("Redis 回答薄弱", {
      strengths: ["项目表达清楚"],
      weaknesses: ["MySQL 索引原理不熟"],
      nextPractice: ["练习 MySQL 索引和事务"],
    });

    expect(merged).toContain("Redis 回答薄弱");
    expect(merged).toContain("MySQL 索引原理不熟");
    expect(merged).toContain("项目表达清楚");
  });
});
