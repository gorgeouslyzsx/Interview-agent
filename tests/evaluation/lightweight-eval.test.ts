import { describe, expect, it } from "vitest";
import {
  LIGHTWEIGHT_LIVE_CASES,
  LIGHTWEIGHT_PLAN_EXECUTE_CASES,
  LIGHTWEIGHT_PLANNER_CASES,
  LIGHTWEIGHT_SAFETY_CASES,
  normalizeEvalModel,
  runLightweightEval,
  summarizeEvalResult,
} from "@/lib/evaluation/lightweight-eval";
import type { LLMClient } from "@/lib/llm/client";

function llmReturning(content: string): LLMClient {
  return {
    complete: async () => content,
    completeWithUsage: async () => ({
      content,
      usage: {
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
        cachedTokens: 0,
        cacheHitRate: 0,
        estimatedSavedPromptTokens: 0,
      },
    }),
  };
}

describe("lightweight eval", () => {
  it("defines a small but meaningful eval set", () => {
    expect(LIGHTWEIGHT_PLANNER_CASES.length).toBeGreaterThanOrEqual(7);
    expect(LIGHTWEIGHT_PLAN_EXECUTE_CASES.length).toBeGreaterThanOrEqual(4);
    expect(LIGHTWEIGHT_SAFETY_CASES.length).toBeGreaterThanOrEqual(5);
    expect(LIGHTWEIGHT_LIVE_CASES.length).toBeGreaterThanOrEqual(3);
  });

  it("evaluates the two-layer Plan-and-Execute architecture", async () => {
    const result = await runLightweightEval({ includeLive: false });

    expect(result.byCategory.plan_execute.failed).toBe(0);
    expect(result.results.some((item) => item.id === "plan-execute-initial-plan-global-stages")).toBe(true);
    expect(result.results.some((item) => item.id === "plan-execute-next-step-stays-in-current-stage")).toBe(true);
    expect(result.results.some((item) => item.id === "plan-execute-stage-transition-updates-state")).toBe(true);
    expect(result.results.some((item) => item.id === "plan-execute-llm-plan-cannot-jump-stage")).toBe(true);
  });

  it("normalizes the requested DeepSeek model alias", () => {
    expect(normalizeEvalModel("deepseekv4flash")).toBe("deepseek-v4-flash");
    expect(normalizeEvalModel("deepseek-v4-flash")).toBe("deepseek-v4-flash");
  });

  it("passes the offline planner, safety, and resilience evals", async () => {
    const result = await runLightweightEval({ includeLive: false });

    expect(result.failed).toBe(0);
    expect(result.byCategory.planner.failed).toBe(0);
    expect(result.byCategory.safety.failed).toBe(0);
    expect(result.byCategory.resilience.failed).toBe(0);
  });

  it("runs live-generation checks through an injected LLM without storing the API key", async () => {
    const result = await runLightweightEval({
      includeLive: true,
      apiKey: "test-secret-key",
      model: "deepseekv4flash",
      llm: llmReturning("请继续说明 Redis key、TTL、MySQL、React 性能优化和 Java 后端项目细节？"),
    });

    expect(result.failed).toBe(0);
    expect(result.model).toBe("deepseek-v4-flash");
    expect(JSON.stringify(result)).not.toContain("test-secret-key");
  });

  it("formats a concise human-readable summary", async () => {
    const result = await runLightweightEval({ includeLive: false });
    const summary = summarizeEvalResult(result);

    expect(summary).toContain("Lightweight Eval");
    expect(summary).toContain("planner");
    expect(summary).toContain(`${result.passed}/${result.total}`);
  });
});
