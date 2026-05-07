import { nanoid } from "nanoid";
import type { Difficulty, QuestionItem, QuestionType } from "@/lib/domain/types";

function inferDifficulty(text: string): Difficulty {
  if (/困难|hard|高级|大厂/i.test(text)) return "hard";
  if (/简单|easy|基础/i.test(text)) return "easy";
  return "medium";
}

function inferType(text: string): QuestionType {
  if (/系统设计|架构/.test(text)) return "system_design";
  if (/算法|代码|coding/i.test(text)) return "coding";
  if (/项目|经历/.test(text)) return "project";
  if (/行为|冲突|沟通/.test(text)) return "behavioral";
  return "technical";
}

export function parseQuestionBank(rawText: string, userId: string): QuestionItem[] {
  return rawText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const questionLine = lines.find((line) => /题目|Q[:：]/i.test(line)) ?? lines[0];
      const answerLine = lines.find((line) => /答案|参考/i.test(line));
      const tags = lines.join(" ").match(/Java|Redis|MySQL|React|TypeScript|系统设计|算法/g) ?? [];

      return {
        id: nanoid(),
        userId,
        question: questionLine.replace(/^(题目|Q)[:：]\s*/i, ""),
        skillTags: Array.from(new Set(tags)),
        difficulty: inferDifficulty(block),
        type: inferType(block),
        referenceAnswer: answerLine?.replace(/^(参考答案|答案)[:：]\s*/i, ""),
        evaluationPoints: Array.from(new Set(tags)),
        createdAt: new Date().toISOString(),
      };
    });
}
