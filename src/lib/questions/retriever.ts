import type { Difficulty, QuestionItem } from "@/lib/domain/types";

type RetrieveInput = {
  questions: QuestionItem[];
  jdSkills: string[];
  difficulty?: Difficulty;
  weakPoints?: string[];
  queryText?: string;
  limit?: number;
};

function normalize(text: string) {
  return text.toLowerCase();
}

function tokenize(text: string) {
  return Array.from(new Set(normalize(text).match(/[a-z0-9+#.]+|[\u4e00-\u9fa5]{2,}/g) ?? []));
}

function scoreQuestion(question: QuestionItem, input: RetrieveInput): number {
  const tags = question.skillTags.map((tag) => tag.toLowerCase());
  const jdSkillScore = input.jdSkills.filter((skill) => tags.includes(skill.toLowerCase())).length * 3;
  const weakPointScore =
    input.weakPoints?.filter((skill) => tags.includes(skill.toLowerCase())).length ?? 0;
  const difficultyScore = input.difficulty && question.difficulty === input.difficulty ? 2 : 0;
  const queryTokens = tokenize([input.queryText, ...input.jdSkills].filter(Boolean).join(" "));
  const questionText = normalize(
    [question.question, ...question.skillTags, ...question.evaluationPoints].join(" "),
  );
  const queryScore = queryTokens.filter((token) => questionText.includes(token)).length;

  return jdSkillScore + weakPointScore + difficultyScore + queryScore;
}

export function retrieveQuestions(input: RetrieveInput): QuestionItem[] {
  const limit = input.limit ?? 5;

  return [...input.questions]
    .sort((a, b) => scoreQuestion(b, input) - scoreQuestion(a, input))
    .slice(0, limit);
}
