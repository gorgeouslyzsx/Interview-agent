import { describe, expect, it } from "vitest";
import { createReportFromTranscript, parseStoredReport } from "@/lib/evaluation/report";

describe("evaluation report generation", () => {
  it("creates evidence-based skill scores from the transcript instead of a fixed placeholder", () => {
    const report = createReportFromTranscript(
      [
        "assistant: 请说明 React 性能优化项目。",
        "user: 我负责列表页性能优化，用 React.memo、虚拟列表和接口分页，把首屏从 3 秒降到 1.2 秒。",
        "assistant: 你如何处理异常？",
        "user: 我会记录接口错误并提供重试，同时把边界场景写进测试。",
      ].join("\n"),
      {
        jdSkills: ["React", "TypeScript", "前端性能"],
        targetRole: "React 前端工程师",
      },
    );

    expect(report.summary).toContain("React 前端工程师");
    expect(report.skillScores.length).toBeGreaterThanOrEqual(2);
    expect(report.skillScores.some((score) => score.skill.includes("React"))).toBe(true);
    expect(report.skillScores.every((score) => score.evidence.trim().length > 0)).toBe(true);
    expect(report.summary).not.toContain("建议结合后续真实模型输出进一步细化");
  });

  it("parses a stored report safely and returns null for invalid JSON", () => {
    const stored = JSON.stringify(
      createReportFromTranscript("user: 我负责 Redis 缓存和 MySQL 落库。", {
        jdSkills: ["Redis"],
        targetRole: "Java 后端工程师",
      }),
    );

    expect(parseStoredReport(stored)?.skillScores[0]?.evidence).toContain("Redis");
    expect(parseStoredReport("{not-json")).toBeNull();
  });
});
