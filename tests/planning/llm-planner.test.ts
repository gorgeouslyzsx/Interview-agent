import { describe, expect, it, vi } from "vitest";
import type { LLMClient } from "@/lib/llm/client";
import { generateInitialInterviewPlan, getCurrentStage } from "@/lib/planning/interview-planner";
import { generateInitialInterviewPlanWithLLM, planNextStepWithLLM } from "@/lib/planning/llm-planner";

function llmReturning(content: string, onPrompt?: (prompt: string) => void): LLMClient {
  return {
    async complete(prompt) {
      const serialized = JSON.stringify(prompt);
      onPrompt?.(serialized);
      return content;
    },
    async completeWithUsage(prompt) {
      const serialized = JSON.stringify(prompt);
      onPrompt?.(serialized);
      return { content };
    },
  };
}

describe("LLM-backed interview planner", () => {
  it("uses a valid LLM initial interview plan after guardrail validation", async () => {
    let prompt = "";
    const plan = await generateInitialInterviewPlanWithLLM({
      jdSummary: "岗位要求：AI 应用开发工程师，需要 RAG、Agent Memory、Redis、MySQL。",
      identityMemory: "历史薄弱点：TTL 策略不清楚。",
      targetRole: "AI 应用开发工程师",
      strictness: "high",
      interviewStyle: "technical",
      historicalWeaknesses: ["TTL 策略"],
      sessionGoal: "评估项目落地能力",
      llm: llmReturning(
        JSON.stringify({
          session_goal: "LLM 定制：评估 AI 应用项目落地能力",
          target_role: "AI 应用开发工程师",
          strictness: "high",
          interview_style: "technical",
          historical_weaknesses: ["TTL 策略"],
          stages: [
            {
              stage_id: "stage_01",
              stage_name: "项目真实性确认",
              target_skill: "project_authenticity",
              priority: "core",
              purpose: "确认真实参与度",
              knowledge_points: ["项目背景", "个人职责", "技术选型原因"],
              suggested_question_count: 2,
              expected_depth: "能说清职责、实现和结果",
              pass_criteria: ["能说明项目背景", "能说明个人职责"],
              stop_criteria: ["能给出足够项目证据"],
              follow_up_directions: ["追问请求链路"],
            },
            {
              stage_id: "stage_02",
              stage_name: "Agent Memory 深挖",
              target_skill: "memory_management",
              priority: "core",
              purpose: "验证 memory 工程设计",
              knowledge_points: ["Redis key 设计", "TTL 策略", "memory 写入条件"],
              suggested_question_count: 3,
              expected_depth: "能说明 key、TTL 和沉淀策略",
              pass_criteria: ["能说明 Redis key", "能说明 TTL"],
              stop_criteria: ["核心点已覆盖"],
              follow_up_directions: ["追问 TTL", "追问写入条件"],
            },
          ],
        }),
        (value) => {
          prompt = value;
        },
      ),
    });

    expect(plan.session_goal).toBe("LLM 定制：评估 AI 应用项目落地能力");
    expect(plan.stages[1]).toMatchObject({
      stage_id: "stage_02",
      target_skill: "memory_management",
      priority: "core",
    });
    expect(prompt).toContain("只返回 JSON");
    expect(prompt).toContain("JD summary");
  });

  it("falls back to the deterministic initial planner when the LLM plan is invalid", async () => {
    const plan = await generateInitialInterviewPlanWithLLM({
      jdSummary: "需要 Agent Memory、Redis、MySQL。",
      targetRole: "AI 应用开发工程师",
      strictness: "high",
      llm: llmReturning("我觉得应该先聊项目。"),
    });

    expect(plan.session_goal).toContain("AI 应用开发工程师");
    expect(plan.stages[0]).toMatchObject({
      stage_id: "stage_01",
      target_skill: "project_authenticity",
    });
  });

  it("does not block session creation when the initial planning LLM is slow", async () => {
    vi.useFakeTimers();
    try {
      const planPromise = generateInitialInterviewPlanWithLLM({
        jdSummary: "岗位要求：Java 后端工程师，需要 Redis、MySQL。",
        targetRole: "Java 后端工程师",
        strictness: "medium",
        llmTimeoutMs: 1000,
        llm: {
          complete: () => new Promise<string>(() => undefined),
          completeWithUsage: () => new Promise(() => undefined),
        },
      });
      let settled = false;
      planPromise.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();

      expect(settled).toBe(true);
      await expect(planPromise).resolves.toMatchObject({
        target_role: "Java 后端工程师",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to deterministic next-step planning when the LLM planner is slow", async () => {
    vi.useFakeTimers();
    try {
      const interviewPlan = generateInitialInterviewPlan({
        jdSummary: "AI 应用开发工程师，需要 Agent Memory、Redis、MySQL。",
        strictness: "medium",
      });
      const currentStage = interviewPlan.stages.find((stage) => stage.target_skill === "memory_management") ?? getCurrentStage(interviewPlan);

      const nextStepPromise = planNextStepWithLLM({
        turnId: "turn_02",
        currentStage,
        candidateAnswer: "我会把 Redis 当短期状态存储，MySQL 存长期记录。",
        strictness: "medium",
        followUpCount: 0,
        interviewPlan,
        llmTimeoutMs: 1000,
        llm: {
          complete: () => new Promise<string>(() => undefined),
          completeWithUsage: () => new Promise(() => undefined),
        },
      } as Parameters<typeof planNextStepWithLLM>[0] & { llmTimeoutMs: number });
      let settled = false;
      nextStepPromise.then(() => {
        settled = true;
      });

      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();

      expect(settled).toBe(true);
      await expect(nextStepPromise).resolves.toMatchObject({
        turn_id: "turn_02",
        current_target_skill: currentStage.target_skill,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses a valid LLM next-step plan but pins stage identity and follow-up limits to server state", async () => {
    const interviewPlan = generateInitialInterviewPlan({
      jdSummary: "AI 应用开发工程师，需要 Agent Memory、Redis、MySQL。",
      targetRole: "AI 应用开发工程师",
      strictness: "high",
      interviewStyle: "technical",
    });
    const currentStage = interviewPlan.stages.find((stage) => stage.target_skill === "memory_management") ?? getCurrentStage(interviewPlan);

    const nextStep = await planNextStepWithLLM({
      turnId: "turn_03",
      currentStage,
      candidateAnswer: "我刚才说这个模块不是我负责的，但之前我说过我独立负责。",
      strictness: "high",
      followUpCount: 1,
      previousAnswers: ["我独立负责了 Agent Memory 模块并上线了。"],
      interviewPlan,
      llm: llmReturning(
        JSON.stringify({
          turn_id: "turn_03",
          current_stage: "LLM 写错的阶段",
          current_target_skill: "wrong_skill",
          answer_quality: {
            correctness: 3,
            specificity: 2,
            depth: 2,
            project_relevance: 3,
            clarity: 3,
            evidence_strength: 1,
          },
          covered_knowledge_points: ["个人职责"],
          missing_knowledge_points: ["请求链路", "数据结构"],
          detected_issues: [{ type: "inconsistency", description: "前后职责说法不一致" }],
          risk_flags: ["inconsistency"],
          decision: "challenge_inconsistency",
          decision_reason: "需要核实真实职责",
          next_action: {
            action_type: "verify_inconsistency",
            question: "请按一次真实请求链路说明你负责哪一段。",
            why_ask_this: "核实项目参与程度。",
            knowledge_points_to_cover: ["请求链路"],
            expected_good_answer_points: ["能说明负责模块和调用链路"],
          },
          stage_control: {
            should_continue_current_stage: true,
            should_move_to_next_stage: false,
            should_end_interview: false,
            follow_up_count_in_current_stage: 99,
            max_follow_up_count: 99,
            stop_follow_up_condition: "LLM 自己写的限制",
          },
        }),
      ),
    });

    expect(nextStep.decision).toBe("challenge_inconsistency");
    expect(nextStep.current_stage).toBe(currentStage.stage_name);
    expect(nextStep.current_target_skill).toBe(currentStage.target_skill);
    expect(nextStep.stage_control.follow_up_count_in_current_stage).toBe(1);
    expect(nextStep.stage_control.max_follow_up_count).toBe(3);
  });

  it("falls back to deterministic next-step planning when the LLM decision is not allowed", async () => {
    const interviewPlan = generateInitialInterviewPlan({
      jdSummary: "AI 应用开发工程师，需要 Agent Memory、Redis、MySQL。",
      strictness: "high",
    });
    const currentStage = interviewPlan.stages.find((stage) => stage.target_skill === "memory_management") ?? getCurrentStage(interviewPlan);

    const nextStep = await planNextStepWithLLM({
      turnId: "turn_04",
      currentStage,
      candidateAnswer: "Redis 是关系型数据库，所以我把所有长期记忆只放 Redis。",
      strictness: "high",
      followUpCount: 0,
      interviewPlan,
      llm: llmReturning(
        JSON.stringify({
          decision: "invent_new_decision",
          next_action: { question: "随便问一个问题" },
        }),
      ),
    });

    expect(nextStep.decision).toBe("correct_and_continue");
    expect(nextStep.next_action.question).toContain("Redis 不是关系型数据库");
  });

  it("hard-stops LLM follow-up when server follow-up rules say the stage should stop", async () => {
    const interviewPlan = generateInitialInterviewPlan({
      jdSummary: "AI 应用开发工程师，需要 Agent Memory、Redis、MySQL。",
      strictness: "high",
    });
    const currentStage = interviewPlan.stages.find((stage) => stage.target_skill === "memory_management") ?? getCurrentStage(interviewPlan);

    const nextStep = await planNextStepWithLLM({
      turnId: "turn_05",
      currentStage,
      candidateAnswer: "不太清楚，就大概用 Redis。",
      strictness: "high",
      followUpCount: 3,
      interviewPlan,
      llm: llmReturning(
        JSON.stringify({
          turn_id: "turn_05",
          current_stage: currentStage.stage_name,
          current_target_skill: currentStage.target_skill,
          answer_quality: {
            correctness: 3,
            specificity: 1,
            depth: 1,
            project_relevance: 1,
            clarity: 2,
            evidence_strength: 1,
          },
          covered_knowledge_points: [],
          missing_knowledge_points: ["Redis key 设计", "TTL 策略"],
          detected_issues: [{ type: "too_vague", description: "缺少细节" }],
          risk_flags: ["insufficient_detail"],
          decision: "follow_up",
          decision_reason: "还想继续问",
          next_action: {
            action_type: "ask_follow_up",
            question: "继续追问 Redis key。",
            why_ask_this: "继续挖细节。",
            knowledge_points_to_cover: ["Redis key 设计"],
            expected_good_answer_points: ["能说明 key"],
          },
          stage_control: {
            should_continue_current_stage: true,
            should_move_to_next_stage: false,
            should_end_interview: false,
            follow_up_count_in_current_stage: 3,
            max_follow_up_count: 3,
            stop_follow_up_condition: "继续追问",
          },
        }),
      ),
    });

    expect(nextStep.decision).toBe("finish_stage");
    expect(nextStep.stage_control.should_continue_current_stage).toBe(false);
    expect(nextStep.stage_control.should_move_to_next_stage).toBe(true);
  });
});
