import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { questionUploadSchema } from "@/lib/domain/schemas";
import { parseQuestionBank } from "@/lib/questions/parser";
import { validateUploadedContent } from "@/lib/guardrails/guardrail";

const DEMO_USER_ID = "demo-user";

export async function POST(request: Request) {
  const { rawText } = questionUploadSchema.parse(await request.json());
  const guard = validateUploadedContent(rawText);

  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 400 });
  }

  const questions = parseQuestionBank(rawText, DEMO_USER_ID);
  const prisma = getPrisma();

  await prisma.questionItem.createMany({
    data: questions.map((question) => ({
      id: question.id,
      userId: question.userId,
      question: question.question,
      skillTagsJson: JSON.stringify(question.skillTags),
      difficulty: question.difficulty,
      type: question.type,
      referenceAnswer: question.referenceAnswer,
      evaluationPointsJson: JSON.stringify(question.evaluationPoints),
    })),
  });

  return NextResponse.json({ count: questions.length });
}
