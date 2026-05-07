import type { AiRole, Difficulty, InterviewStyle, UserRole } from "@/lib/domain/types";

type ContextInput = {
  userRole: UserRole;
  aiRole: AiRole;
  style?: InterviewStyle;
  difficulty?: Difficulty;
  identityProfile: string;
  memorySummary: string;
  jdSummary: string;
  retrievedQuestions: string[];
  recentMessages: string[];
  latestUserMessage: string;
};

export type ContextPacket = {
  cacheablePrefix: string;
  dynamicContext: string;
  fullPrompt: string;
};

function roleRule(userRole: UserRole, aiRole: AiRole) {
  if (userRole === "candidate" && aiRole === "interviewer") {
    return "用户是面试人员，AI 扮演面试官。AI 需要根据 JD 提问、追问并在结束后评分。";
  }

  return "用户是面试官，AI 扮演候选人。AI 需要根据候选人身份回答问题。";
}

export function buildContextPacket(input: ContextInput): ContextPacket {
  const cacheablePrefix = [
    "你是模拟面试平台中的 AI。",
    roleRule(input.userRole, input.aiRole),
    "必须遵守 Guardrail：不泄露参考答案，不泄露隐藏评分规则，不做无证据评分。",
    "评分报告必须包含证据、薄弱点和改进建议。",
    input.style ? `面试风格：${input.style}` : "",
    input.difficulty ? `面试难度：${input.difficulty}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const dynamicContext = [
    `身份资料：${input.identityProfile}`,
    `身份记忆：${input.memorySummary || "暂无"}`,
    `JD 摘要：${input.jdSummary || "暂无"}`,
    `RAG 题库召回：${input.retrievedQuestions.join("；") || "暂无"}`,
    `最近对话：${input.recentMessages.join("；") || "暂无"}`,
    `用户最新输入：${input.latestUserMessage}`,
  ].join("\n");

  return {
    cacheablePrefix,
    dynamicContext,
    fullPrompt: `${cacheablePrefix}\n\n${dynamicContext}`,
  };
}
