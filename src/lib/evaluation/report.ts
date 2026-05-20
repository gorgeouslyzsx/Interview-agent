import type { InterviewReport } from "@/lib/domain/types";

type ReportInput = {
  jdSkills?: string[];
  targetRole?: string;
};

const DEFAULT_SKILLS = ["岗位匹配度", "技术深度", "项目表达", "沟通清晰度"];

function clampScore(score: number) {
  return Math.max(1, Math.min(10, Math.round(score)));
}

function userAnswerLines(transcript: string) {
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^user[:：]/i.test(line))
    .map((line) => line.replace(/^user[:：]\s*/i, "").trim())
    .filter(Boolean);
}

function findEvidence(answers: string[], terms: string[]) {
  const normalizedTerms = terms.map((term) => term.toLowerCase()).filter(Boolean);
  const matched = answers.find((answer) => {
    const normalized = answer.toLowerCase();
    return normalizedTerms.some((term) => normalized.includes(term));
  });

  return matched ?? answers[0] ?? "本次会话中候选人没有提供足够回答证据。";
}

function evidenceScore(evidence: string, terms: string[]) {
  const normalized = evidence.toLowerCase();
  const hitCount = terms.filter((term) => normalized.includes(term.toLowerCase())).length;
  const concreteSignalCount = (evidence.match(/负责|上线|指标|测试|接口|表|key|优化|降到|提升|重试|边界/g) ?? []).length;
  return clampScore(5 + hitCount + Math.min(3, concreteSignalCount));
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function createReportFromTranscript(transcript: string, input: ReportInput = {}): InterviewReport {
  const answers = userAnswerLines(transcript);
  const role = input.targetRole || "目标岗位";
  const skills = unique([...(input.jdSkills ?? []).slice(0, 5), ...DEFAULT_SKILLS]).slice(0, 7);
  const skillScores = skills.map((skill) => {
    const evidence = findEvidence(answers, [skill, ...skill.split(/[、\s/]+/)]);
    const score = evidenceScore(evidence, [skill]);

    return {
      skill,
      score,
      evidence,
      suggestion:
        score >= 8
          ? `继续保持 ${skill} 的具体证据表达，下一轮可以补充边界和取舍。`
          : `围绕 ${skill} 补充可验证细节，例如职责、数据、异常处理和结果。`,
    };
  });
  const overallScore = clampScore(
    skillScores.reduce((total, score) => total + score.score, 0) / Math.max(1, skillScores.length),
  ) * 10;
  const weakSkills = skillScores.filter((score) => score.score < 7).map((score) => score.skill);
  const strongSkills = skillScores.filter((score) => score.score >= 8).map((score) => score.skill);

  return {
    overallScore,
    result: overallScore >= 80 ? "表现良好" : overallScore >= 65 ? "需要继续练习" : "基础证据不足",
    summary: `本次复盘面向${role}，基于 ${answers.length} 条候选人回答提取证据。${
      weakSkills.length ? `优先补强：${weakSkills.slice(0, 3).join("、")}。` : "整体回答具备一定证据密度。"
    }`,
    skillScores,
    strengths: strongSkills.length ? strongSkills.map((skill) => `${skill} 有相对具体的回答证据`) : ["能够完成基本对话并给出部分经历信息"],
    weaknesses: weakSkills.length ? weakSkills.map((skill) => `${skill} 缺少足够具体、可验证的回答证据`) : ["下一轮可继续补充边界场景和量化结果"],
    nextPractice: weakSkills.length
      ? weakSkills.slice(0, 3).map((skill) => `针对 ${skill} 准备 STAR 结构和项目数据`)
      : ["练习更高难度追问，补充失败恢复、性能和成本取舍"],
  };
}

export function parseStoredReport(value: string | null | undefined): InterviewReport | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as InterviewReport;
    if (!Array.isArray(parsed.skillScores) || typeof parsed.summary !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createFallbackReport(transcript: string): InterviewReport {
  return createReportFromTranscript(transcript);
}
