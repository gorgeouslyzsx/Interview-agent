import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { messageSchema } from "@/lib/domain/schemas";
import { parseJsonArray } from "@/lib/domain/json";
import { retrieveQuestions } from "@/lib/questions/retriever";
import { createOpenAICompatibleClient } from "@/lib/llm/client";
import { createInterviewTurn } from "@/lib/interview/orchestrator";
import { canAppendMessageToSession, createBlockedAssistantMessage } from "@/lib/interview/session-policy";
import { prepareSessionContextText } from "@/lib/context/session-context";
import { decryptSecret } from "@/lib/security/secrets";
import { getRequestUserId } from "@/lib/auth/request";
import { hasIdentityAccess } from "@/lib/security/identity-access";
import {
  generateInitialInterviewPlan,
  getCurrentStage,
  strictnessFromDifficulty,
  summarizeInitialPlanForContext,
  summarizeNextStepPlanForContext,
  updatePlanningStateAfterTurn,
  type InitialInterviewPlan,
  type PlanningState,
} from "@/lib/planning/interview-planner";
import { planNextStepWithLLM } from "@/lib/planning/llm-planner";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function buildFallbackInitialPlan(session: {
  jd?: { rawText: string; title?: string | null } | null;
  identity: { memorySummary: string };
  difficulty?: string | null;
  style?: string | null;
}): InitialInterviewPlan {
  return generateInitialInterviewPlan({
    jdSummary: session.jd?.rawText ?? "",
    identityMemory: session.identity.memorySummary,
    targetRole: session.jd?.title ?? "目标岗位",
    strictness: strictnessFromDifficulty(session.difficulty),
    interviewStyle: session.style ?? "normal",
    historicalWeaknesses: session.identity.memorySummary ? [session.identity.memorySummary] : [],
  });
}

function buildPlanningState(
  session: {
    currentStageId?: string | null;
    followUpCount?: number | null;
    turnCount?: number | null;
    evidenceCount?: number | null;
    riskFlagsJson?: string | null;
    skillCoverageJson?: string | null;
  },
  plan: InitialInterviewPlan,
): PlanningState {
  return {
    currentStageId: session.currentStageId ?? plan.stages[0]?.stage_id ?? "stage_01",
    followUpCount: session.followUpCount ?? 0,
    turnCount: session.turnCount ?? 0,
    evidenceCount: session.evidenceCount ?? 0,
    riskFlags: parseJson<string[]>(session.riskFlagsJson, []),
    skillCoverage: parseJson<PlanningState["skillCoverage"]>(session.skillCoverageJson, {}),
  };
}

function buildAssistantFallbackContent(nextStepPlan: { next_action: { question: string }; decision: string }) {
  if (nextStepPlan.decision === "finish_interview") {
    return nextStepPlan.next_action.question;
  }

  return nextStepPlan.next_action.question;
}

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { content } = messageSchema.parse(await request.json());
  const prisma = getPrisma();

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: { identity: true, jd: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (
    session.identity.passwordHash &&
    session.identity.passwordSalt &&
    !hasIdentityAccess(request.headers.get("cookie"), session.identityId)
  ) {
    return NextResponse.json({ error: "请先通过身份验证" }, { status: 401 });
  }

  const sessionPolicy = canAppendMessageToSession(session);
  if (!sessionPolicy.allowed) {
    return NextResponse.json({ error: sessionPolicy.reason }, { status: 409 });
  }

  await prisma.message.create({
    data: { id: nanoid(), sessionId, role: "user", content },
  });

  const initialPlan = parseJson<InitialInterviewPlan>(
    session.initialPlanJson,
    buildFallbackInitialPlan(session),
  );
  const planningState = buildPlanningState(session, initialPlan);
  const currentStage = getCurrentStage(initialPlan, planningState.currentStageId);
  const llmClient = createOpenAICompatibleClient({
    apiKey: decryptSecret(session.identity.llmApiKeyEncrypted),
    baseUrl: session.identity.llmBaseUrl,
    model: session.identity.llmModel,
  });
  const unresolvedCoreSkills = initialPlan.stages
    .filter((stage) => stage.priority === "core" && !planningState.skillCoverage[stage.target_skill])
    .map((stage) => stage.target_skill);
  const nextStepPlan = await planNextStepWithLLM({
    turnId: `turn_${String(planningState.turnCount + 1).padStart(2, "0")}`,
    currentStage,
    candidateAnswer: content,
    strictness: initialPlan.strictness,
    followUpCount: planningState.followUpCount,
    previousAnswers: session.messages
      .filter((message) => message.role === "user")
      .slice(-6)
      .map((message) => message.content),
    priorRiskFlags: planningState.riskFlags,
    interviewPlan: initialPlan,
    skillCoverage: planningState.skillCoverage,
    turnCount: planningState.turnCount + 1,
    maxTurns: 12,
    evidenceCount: planningState.evidenceCount,
    unresolvedCoreSkills,
    llm: llmClient,
    llmTimeoutMs: 2500,
  });
  const nextPlanningState = updatePlanningStateAfterTurn({
    plan: initialPlan,
    previousState: planningState,
    nextStepPlan,
  });

  const allQuestions = await prisma.questionItem.findMany({ where: { userId: session.userId } });
  const jdSkills = parseJsonArray<string>(session.jd?.skillsJson);
  const weakPoints = session.identity.memorySummary.match(/Redis|MySQL|Java|React|算法/g) ?? [];
  const retrieved = retrieveQuestions({
    questions: allQuestions.map((question) => ({
      id: question.id,
      userId: question.userId,
      question: question.question,
      skillTags: parseJsonArray<string>(question.skillTagsJson),
      difficulty: question.difficulty as "easy" | "medium" | "hard",
      type: question.type as "behavioral" | "technical" | "system_design" | "coding" | "project",
      referenceAnswer: question.referenceAnswer ?? undefined,
      evaluationPoints: parseJsonArray<string>(question.evaluationPointsJson),
      createdAt: question.createdAt.toISOString(),
    })),
    jdSkills,
    difficulty: session.difficulty as "easy" | "medium" | "hard" | undefined,
    weakPoints,
    queryText: [session.jd?.rawText, session.identity.memorySummary, content].filter(Boolean).join("\n"),
    limit: 5,
  });

  const turn = await createInterviewTurn({
    userRole: session.userRole as "candidate" | "interviewer",
    style: session.style as "friendly" | "normal" | "technical" | "pressure" | undefined,
    difficulty: session.difficulty as "easy" | "medium" | "hard" | undefined,
    identityProfile: session.identity.profile,
    memorySummary: session.identity.memorySummary,
    resumeSummary: prepareSessionContextText(session.resumeText),
    jdSummary: prepareSessionContextText(session.jd?.rawText),
    retrievedQuestions: retrieved.map((question) => question.question),
    recentMessages: session.messages.slice(-6).map((message) => `${message.role}: ${message.content}`),
    latestUserMessage: content,
    initialPlanContext: summarizeInitialPlanForContext(initialPlan, planningState.currentStageId),
    nextStepPlanContext: summarizeNextStepPlanForContext(nextStepPlan),
    assistantFallbackContent:
      session.userRole === "candidate" ? buildAssistantFallbackContent(nextStepPlan) : undefined,
    llmTimeoutMs: 15000,
    llm: llmClient,
  });

  const assistantOutput = createBlockedAssistantMessage(turn.content);
  const assistantMessage = await prisma.message.create({
    data: { id: nanoid(), sessionId, role: "assistant", content: assistantOutput.content },
  });
  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      updatedAt: new Date(),
      initialPlanJson: session.initialPlanJson ?? JSON.stringify(initialPlan),
      currentStageId: nextPlanningState.currentStageId,
      lastNextStepPlanJson: JSON.stringify(nextStepPlan),
      followUpCount: nextPlanningState.followUpCount,
      turnCount: nextPlanningState.turnCount,
      evidenceCount: nextPlanningState.evidenceCount,
      riskFlagsJson: JSON.stringify(nextPlanningState.riskFlags),
      skillCoverageJson: JSON.stringify(nextPlanningState.skillCoverage),
    },
  });

  if (turn.usage) {
    await prisma.llmUsage.create({
      data: {
        id: nanoid(),
        sessionId,
        promptTokens: turn.usage.promptTokens,
        completionTokens: turn.usage.completionTokens,
        totalTokens: turn.usage.totalTokens,
        cachedTokens: turn.usage.cachedTokens,
        estimatedSavedPromptTokens: turn.usage.estimatedSavedPromptTokens,
        cacheHitRate: turn.usage.cacheHitRate,
      },
    });
  }

  return NextResponse.json({
    message: assistantMessage,
    usage: turn.usage,
    nextStepPlan,
    blocked: assistantOutput.blocked,
    blockReason: assistantOutput.reason,
  });
}
