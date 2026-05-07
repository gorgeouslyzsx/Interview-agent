import type { AiRole, Difficulty, InterviewStyle, UserRole } from "@/lib/domain/types";
import { buildContextPacket } from "@/lib/context/context-builder";
import type { LLMClient } from "@/lib/llm/client";

type InterviewTurnInput = {
  userRole: UserRole;
  identityProfile: string;
  memorySummary: string;
  jdSummary: string;
  retrievedQuestions: string[];
  recentMessages: string[];
  latestUserMessage: string;
  style?: InterviewStyle;
  difficulty?: Difficulty;
  llm: LLMClient;
};

export type InterviewTurnResult = {
  aiRole: AiRole;
  content: string;
};

function getAiRole(userRole: UserRole): AiRole {
  return userRole === "candidate" ? "interviewer" : "candidate";
}

export async function createInterviewTurn(input: InterviewTurnInput): Promise<InterviewTurnResult> {
  const aiRole = getAiRole(input.userRole);
  const context = buildContextPacket({
    userRole: input.userRole,
    aiRole,
    identityProfile: input.identityProfile,
    memorySummary: input.memorySummary,
    jdSummary: input.jdSummary,
    retrievedQuestions: input.retrievedQuestions,
    recentMessages: input.recentMessages,
    latestUserMessage: input.latestUserMessage,
    style: input.style,
    difficulty: input.difficulty,
  });

  const content = await input.llm.complete(context.fullPrompt);

  return {
    aiRole,
    content,
  };
}
