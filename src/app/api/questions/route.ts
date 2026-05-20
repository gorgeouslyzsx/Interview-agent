import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { questionUploadSchema } from "@/lib/domain/schemas";
import { parseQuestionBank } from "@/lib/questions/parser";
import { reviewUploadedContent } from "@/lib/guardrails/guardrail";
import { getRequestUserId } from "@/lib/auth/request";

export async function POST(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { rawText } = questionUploadSchema.parse(await request.json());
  const review = reviewUploadedContent(rawText, "题库");

  const questions = parseQuestionBank(review.sanitizedText, userId);
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

  return NextResponse.json({ count: questions.length, warnings: review.findings, notice: review.notice });
}
