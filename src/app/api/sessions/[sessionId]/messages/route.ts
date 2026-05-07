import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { messageSchema } from "@/lib/domain/schemas";
import { parseJsonArray } from "@/lib/domain/json";
import { retrieveQuestions } from "@/lib/questions/retriever";
import { createOpenAICompatibleClient } from "@/lib/llm/client";
import { createInterviewTurn } from "@/lib/interview/orchestrator";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const { content } = messageSchema.parse(await request.json());
  const prisma = getPrisma();

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { identity: true, jd: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await prisma.message.create({
    data: { id: nanoid(), sessionId, role: "user", content },
  });

  const allQuestions = await prisma.questionItem.findMany({ where: { userId: session.userId } });
  const jdSkills = parseJsonArray<string>(session.jd?.skillsJson);
  const weakPoints = session.identity.memorySummary.match(/Redis|MySQL|Java|React|算法/g) ?? [];
  const retrieved = retrieveQuestions({
    questions: allQuestions.map((question) => ({
      id: question.id,
      userId: question.userId,
      question: question.question,
      skillTags: parseJsonArray<string>(question.skillTagsJson),
      difficulty: question.difficulty as "easy" | "medium" | "hard",
      type: question.type as "behavioral" | "technical" | "system_design" | "coding" | "project",
      referenceAnswer: question.referenceAnswer ?? undefined,
      evaluationPoints: parseJsonArray<string>(question.evaluationPointsJson),
      createdAt: question.createdAt.toISOString(),
    })),
    jdSkills,
    difficulty: session.difficulty as "easy" | "medium" | "hard" | undefined,
    weakPoints,
    limit: 5,
  });

  const turn = await createInterviewTurn({
    userRole: session.userRole as "candidate" | "interviewer",
    style: session.style as "friendly" | "normal" | "technical" | "pressure" | undefined,
    difficulty: session.difficulty as "easy" | "medium" | "hard" | undefined,
    identityProfile: session.identity.profile,
    memorySummary: session.identity.memorySummary,
    jdSummary: session.jd?.rawText.slice(0, 1000) ?? "",
    retrievedQuestions: retrieved.map((question) => question.question),
    recentMessages: session.messages.slice(-6).map((message) => `${message.role}: ${message.content}`),
    latestUserMessage: content,
    llm: createOpenAICompatibleClient(),
  });

  const assistantMessage = await prisma.message.create({
    data: { id: nanoid(), sessionId, role: "assistant", content: turn.content },
  });

  return NextResponse.json({ message: assistantMessage });
}
