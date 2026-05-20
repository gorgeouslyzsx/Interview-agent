import { ensureNoReferenceAnswerLeak } from "@/lib/guardrails/guardrail";

export type PolicyResult = {
  allowed: boolean;
  reason?: string;
};

export function canAppendMessageToSession(session: { status: string }): PolicyResult {
  if (session.status === "completed") {
    return { allowed: false, reason: "面试已完成，请创建新会话后继续练习" };
  }

  return { allowed: true };
}

export function shouldRequireIdentityPassword(
  identity: { passwordHash?: string | null; passwordSalt?: string | null },
  providedPassword: string | null | undefined,
) {
  return Boolean(identity.passwordHash && identity.passwordSalt && !providedPassword);
}

export function createBlockedAssistantMessage(output: string) {
  const guard = ensureNoReferenceAnswerLeak(output);

  if (guard.allowed) {
    return { blocked: false, content: output };
  }

  return {
    blocked: true,
    content: "回答触发了安全规则，已拦截本轮输出。请换一种问法继续面试。",
    reason: guard.reason,
  };
}
