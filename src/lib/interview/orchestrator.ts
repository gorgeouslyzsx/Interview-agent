import type { AiRole, Difficulty, InterviewStyle, UserRole } from "@/lib/domain/types";
import { buildContextPacket } from "@/lib/context/context-builder";
import type { LLMClient } from "@/lib/llm/client";

type InterviewTurnInput = {
  userRole: UserRole;
  identityProfile: string;
  memorySummary: string;
  resumeSummary?: string;
  jdSummary: string;
  retrievedQuestions: string[];
  recentMessages: string[];
  latestUserMessage: string;
  initialPlanContext?: string;
  nextStepPlanContext?: string;
  assistantFallbackContent?: string;
  llmTimeoutMs?: number;
  style?: InterviewStyle;
  difficulty?: Difficulty;
  llm: LLMClient;
};

export type InterviewTurnResult = {
  aiRole: AiRole;
  content: string;
  usage?: import("@/lib/llm/client").LLMUsage;
};

function getAiRole(userRole: UserRole): AiRole {
  return userRole === "candidate" ? "interviewer" : "candidate";
}

const DEFAULT_INTERVIEW_TURN_LLM_TIMEOUT_MS = 15000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Interview turn LLM timed out")), timeoutMs);
    (timeout as ReturnType<typeof setTimeout> & { unref?: () => void }).unref?.();
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function fallbackContentFor(input: InterviewTurnInput) {
  if (input.assistantFallbackContent?.trim()) {
    return input.assistantFallbackContent.trim();
  }

  return input.userRole === "candidate"
    ? "模型响应较慢，我先按当前面试计划继续：请你补充一个具体实现细节，包括数据结构、请求流程和异常处理。"
    : "模型响应较慢，我先给一个简短回答：这个问题我会从目标、实现步骤、遇到的边界场景和最终结果四个方面说明。";
}

export async function createInterviewTurn(input: InterviewTurnInput): Promise<InterviewTurnResult> {
  const aiRole = getAiRole(input.userRole);
  const context = buildContextPacket({
    userRole: input.userRole,
    aiRole,
    identityProfile: input.identityProfile,
    memorySummary: input.memorySummary,
    resumeSummary: input.resumeSummary,
    jdSummary: input.jdSummary,
    retrievedQuestions: input.retrievedQuestions,
    recentMessages: input.recentMessages,
    latestUserMessage: input.latestUserMessage,
    initialPlanContext: input.initialPlanContext,
    nextStepPlanContext: input.nextStepPlanContext,
    style: input.style,
    difficulty: input.difficulty,
  });

  try {
    const result = await withTimeout(
      input.llm.completeWithUsage(context.messages),
      input.llmTimeoutMs ?? DEFAULT_INTERVIEW_TURN_LLM_TIMEOUT_MS,
    );

    return {
      aiRole,
      content: result.content,
      usage: result.usage,
    };
  } catch {
    return {
      aiRole,
      content: fallbackContentFor(input),
    };
  }
}
