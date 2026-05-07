import type { InterviewReport } from "@/lib/domain/types";

const INJECTION_PATTERNS = [
  /忽略.*规则/,
  /ignore.*previous.*instructions/i,
  /system prompt/i,
  /泄露.*答案/,
  /直接输出.*标准答案/,
];

const LEAK_PATTERNS = [/参考答案/, /标准答案/, /hidden rubric/i, /评分规则如下/];

export type GuardrailResult = {
  allowed: boolean;
  reason?: string;
};

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateUploadedContent(text: string): GuardrailResult {
  if (detectPromptInjection(text)) {
    return { allowed: false, reason: "上传内容包含试图覆盖系统规则的指令" };
  }

  return { allowed: true };
}

export function ensureNoReferenceAnswerLeak(output: string): GuardrailResult {
  if (LEAK_PATTERNS.some((pattern) => pattern.test(output))) {
    return { allowed: false, reason: "输出疑似泄露参考答案或隐藏评分规则" };
  }

  return { allowed: true };
}

export function validateEvidenceBasedReport(report: InterviewReport): GuardrailResult {
  const missingEvidence = report.skillScores.some((score) => score.evidence.trim().length === 0);

  if (missingEvidence) {
    return { allowed: false, reason: "评分缺少用户回答证据" };
  }

  return { allowed: true };
}
