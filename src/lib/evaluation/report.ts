import type { InterviewReport } from "@/lib/domain/types";

export function createFallbackReport(transcript: string): InterviewReport {
  return {
    overallScore: 70,
    result: "需要继续练习",
    summary: "本次复盘基于当前对话生成，建议结合后续真实模型输出进一步细化。",
    skillScores: [
      {
        skill: "岗位匹配度",
        score: 7,
        evidence: transcript.slice(0, 120) || "当前会话内容较少",
        suggestion: "回答时增加和 JD 技能点的对应关系。",
      },
    ],
    strengths: ["能够完成基本回答"],
    weaknesses: ["需要补充更具体的技术细节"],
    nextPractice: ["围绕 JD 核心技能继续练习"],
  };
}
