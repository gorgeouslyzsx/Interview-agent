import type { InterviewReport } from "@/lib/domain/types";

const INJECTION_PATTERNS = [
  { label: "忽略规则指令", pattern: /忽略.*规则/ },
  { label: "覆盖历史指令", pattern: /ignore.*previous.*instructions/i },
  { label: "系统提示词探测", pattern: /system prompt/i },
  { label: "答案泄露请求", pattern: /泄露.*答案/ },
  { label: "标准答案直出请求", pattern: /直接输出.*标准答案/ },
];

const LEAK_PATTERNS = [/参考答案/, /标准答案/, /hidden rubric/i, /评分规则如下/];

export type GuardrailResult = {
  allowed: boolean;
  reason?: string;
};

export type UploadedContentFinding = {
  sourceLabel: string;
  label: string;
  snippet: string;
  start: number;
  end: number;
  line: number;
  column: number;
};

export type UploadedContentReview = {
  sanitizedText: string;
  findings: UploadedContentFinding[];
  notice?: string;
};

function withGlobalFlag(pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function lineColumnAt(text: string, index: number) {
  let line = 1;
  let column = 1;

  for (let position = 0; position < index; position += 1) {
    if (text[position] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function redactRanges(text: string, ranges: Array<Pick<UploadedContentFinding, "start" | "end">>) {
  const chars = text.split("");

  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1) {
      if (chars[index] !== "\n" && chars[index] !== "\r") {
        chars[index] = " ";
      }
    }
  }

  return chars.join("");
}

function preview(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

function buildUploadNotice(sourceLabel: string, findings: UploadedContentFinding[]) {
  if (findings.length === 0) return undefined;

  const first = findings[0];
  const count = findings.length > 1 ? `，共 ${findings.length} 处` : "";
  return `${sourceLabel} 第 ${first.line} 行检测到试图覆盖系统规则的指令${count}：“${preview(
    first.snippet,
  )}”。已自动用空格遮盖，可在文本框中修改后继续。`;
}

export function reviewUploadedContent(text: string, sourceLabel = "上传内容"): UploadedContentReview {
  const findings = INJECTION_PATTERNS.flatMap(({ label, pattern }) => {
    return Array.from(text.matchAll(withGlobalFlag(pattern))).flatMap((match) => {
      if (typeof match.index !== "number" || match[0].length === 0) return [];

      const start = match.index;
      const end = start + match[0].length;
      const { line, column } = lineColumnAt(text, start);

      return [
        {
          sourceLabel,
          label,
          snippet: match[0],
          start,
          end,
          line,
          column,
        },
      ];
    });
  }).sort((left, right) => left.start - right.start);

  return {
    sanitizedText: redactRanges(text, findings),
    findings,
    notice: buildUploadNotice(sourceLabel, findings),
  };
}

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(({ pattern }) => pattern.test(text));
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
