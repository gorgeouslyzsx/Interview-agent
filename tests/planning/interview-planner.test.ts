import { describe, expect, it } from "vitest";
import { buildContextPacket } from "@/lib/context/context-builder";
import {
  generateInitialInterviewPlan,
  createOpeningQuestion,
  getCurrentStage,
  planNextStep,
  summarizeInitialPlanForContext,
  summarizeNextStepPlanForContext,
  updatePlanningStateAfterTurn,
} from "@/lib/planning/interview-planner";

describe("interview planner", () => {
  it("generates and compacts an initial interview plan for stable session context", () => {
    const plan = generateInitialInterviewPlan({
      jdSummary: "岗位：AI 应用开发工程师。要求熟悉 LLM、RAG、Agent Memory、Redis、MySQL 和工程落地。",
      identityMemory: "历史薄弱点：项目细节不够，Redis TTL 策略不清楚。",
      targetRole: "AI 应用开发工程师",
      strictness: "high",
      interviewStyle: "technical",
      historicalWeaknesses: ["Redis TTL 策略", "项目真实性"],
      sessionGoal: "评估候选人是否具备 AI 应用开发工程师的项目落地能力",
    });

    expect(plan.session_goal).toBe("评估候选人是否具备 AI 应用开发工程师的项目落地能力");
    expect(plan.stages.length).toBeGreaterThanOrEqual(3);
    expect(plan.stages[0]).toMatchObject({
      stage_id: "stage_01",
      target_skill: "project_authenticity",
    });
    expect(plan.stages.some((stage) => stage.target_skill === "memory_management")).toBe(true);

    const compact = summarizeInitialPlanForContext(plan, "stage_02");

    expect(compact).toContain("Initial Interview Plan");
    expect(compact).toContain("当前阶段");
    expect(compact).toContain("stage_02");
    expect(compact.length).toBeLessThan(1800);
  });

  it("does not force agent-engineering stages into an unrelated frontend JD", () => {
    const plan = generateInitialInterviewPlan({
      jdSummary: "岗位：React 前端工程师。要求熟悉 React、TypeScript、CSS、组件设计和前端性能优化。",
      targetRole: "React 前端工程师",
      strictness: "medium",
      interviewStyle: "normal",
    });

    const targetSkills = plan.stages.map((stage) => stage.target_skill);

    expect(targetSkills).toContain("frontend_engineering");
    expect(targetSkills).not.toContain("llm_integration");
    expect(targetSkills).not.toContain("memory_management");
    expect(targetSkills).not.toContain("backend_engineering");
  });

  it("creates an opening interviewer question from the first stage", () => {
    const plan = generateInitialInterviewPlan({
      jdSummary: "岗位：React 前端工程师。要求熟悉 React、TypeScript、前端性能优化。",
      targetRole: "React 前端工程师",
    });

    expect(createOpeningQuestion(plan)).toContain(plan.stages[0].stage_name);
    expect(createOpeningQuestion(plan)).toContain("请");
  });

  it("plans a follow-up before the model writes the next answer and compacts it for dynamic context", () => {
    const plan = generateInitialInterviewPlan({
      jdSummary: "AI 应用开发工程师，需要 Agent Memory、Redis、MySQL。",
      targetRole: "AI 应用开发工程师",
      strictness: "high",
      interviewStyle: "technical",
      historicalWeaknesses: ["Redis TTL 策略"],
    });
    const currentStage = plan.stages.find((stage) => stage.target_skill === "memory_management") ?? plan.stages[0];
    const nextStep = planNextStep({
      turnId: "turn_05",
      currentStage,
      candidateAnswer: "Redis 存短期上下文，MySQL 存长期记录。",
      strictness: "high",
      followUpCount: 1,
      maxFollowUpCount: 3,
      turnCount: 5,
      maxTurns: 12,
      evidenceCount: 2,
    });

    expect(nextStep.decision).toBe("follow_up");
    expect(nextStep.missing_knowledge_points).toContain("TTL 策略");
    expect(nextStep.next_action.action_type).toBe("ask_follow_up");

    const compact = summarizeNextStepPlanForContext(nextStep);

    expect(compact).toContain("NextStep Plan");
    expect(compact).toContain("decision=follow_up");
    expect(compact).toContain("TTL 策略");
    expect(compact.length).toBeLessThan(1200);
  });

  it("injects fixed, static, and dynamic planning layers into the three-message context", () => {
    const plan = generateInitialInterviewPlan({
      jdSummary: "AI 应用开发工程师，需要 Agent Memory、Redis、MySQL。",
      targetRole: "AI 应用开发工程师",
      strictness: "high",
      interviewStyle: "technical",
    });
    const currentStage = getCurrentStage(plan, "stage_02");
    const nextStep = planNextStep({
      turnId: "turn_01",
      currentStage,
      candidateAnswer: "Redis 存短期上下文，MySQL 存长期记录。",
      strictness: "high",
      followUpCount: 0,
    });
    const packet = buildContextPacket({
      userRole: "candidate",
      aiRole: "interviewer",
      style: "technical",
      difficulty: "hard",
      identityProfile: "AI 应用工程师候选人",
      memorySummary: "Redis TTL 策略薄弱",
      jdSummary: "需要 Agent Memory 和 RAG 落地经验",
      retrievedQuestions: ["Agent Memory 如何设计？"],
      recentMessages: ["assistant: 请介绍你的项目"],
      latestUserMessage: "Redis 存短期上下文，MySQL 存长期记录。",
      initialPlanContext: summarizeInitialPlanForContext(plan, currentStage.stage_id),
      nextStepPlanContext: summarizeNextStepPlanForContext(nextStep),
    });

    expect(packet.cacheablePrefix).toContain("必须服从服务端提供的 NextStep Plan");
    expect(packet.sessionStaticContext).toContain("Initial Interview Plan");
    expect(packet.dynamicContext).toContain("NextStep Plan");
    expect(packet.messages).toHaveLength(3);
    expect(packet.messages[1].content).toBe(packet.sessionStaticContext);
    expect(packet.messages[2].content).toBe(packet.dynamicContext);
  });

  it("updates compact planning state after each turn", () => {
    const plan = generateInitialInterviewPlan({
      jdSummary: "AI 应用开发工程师，需要 Agent Memory、Redis、MySQL。",
      strictness: "high",
      interviewStyle: "technical",
    });
    const currentStage = getCurrentStage(plan, "stage_01");
    const nextStep = planNextStep({
      turnId: "turn_01",
      currentStage,
      candidateAnswer: "我做过这个模块，但具体就 Redis、MySQL、LLM 差不多这样。",
      strictness: "high",
      priorRiskFlags: ["insufficient_detail", "insufficient_detail"],
      followUpCount: 2,
    });
    const state = updatePlanningStateAfterTurn({
      plan,
      previousState: {
        currentStageId: currentStage.stage_id,
        followUpCount: 2,
        turnCount: 0,
        evidenceCount: 0,
        riskFlags: ["insufficient_detail"],
        skillCoverage: {},
      },
      nextStepPlan: nextStep,
    });

    expect(state.turnCount).toBe(1);
    expect(state.riskFlags).toContain("project_authenticity_risk");
    expect(state.skillCoverage.project_authenticity).toBe("effective_failure");
    expect(state.followUpCount).toBeGreaterThanOrEqual(0);
  });
});
