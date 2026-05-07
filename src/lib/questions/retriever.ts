import type { Difficulty, QuestionItem } from "@/lib/domain/types";

type RetrieveInput = {
  questions: QuestionItem[];
  jdSkills: string[];
  difficulty?: Difficulty;
  weakPoints?: string[];
  limit?: number;
};

function scoreQuestion(question: QuestionItem, input: RetrieveInput): number {
  const tags = question.skillTags.map((tag) => tag.toLowerCase());
  const jdSkillScore = input.jdSkills.filter((skill) => tags.includes(skill.toLowerCase())).length * 3;
  const weakPointScore =
    input.weakPoints?.filter((skill) => tags.includes(skill.toLowerCase())).length ?? 0;
  const difficultyScore = input.difficulty && question.difficulty === input.difficulty ? 2 : 0;

  return jdSkillScore + weakPointScore + difficultyScore;
}

export function retrieveQuestions(input: RetrieveInput): QuestionItem[] {
  const limit = input.limit ?? 5;

  return [...input.questions]
    .sort((a, b) => scoreQuestion(b, input) - scoreQuestion(a, input))
    .slice(0, limit);
}
