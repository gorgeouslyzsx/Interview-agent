import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { createFallbackReport } from "@/lib/evaluation/report";
import { validateEvidenceBasedReport } from "@/lib/guardrails/guardrail";
import { mergeMemorySummary } from "@/lib/memory/memory-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const prisma = getPrisma();
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: { identity: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const transcript = session.messages.map((message) => `${message.role}: ${message.content}`).join("\n");
  const report = createFallbackReport(transcript);
  const guard = validateEvidenceBasedReport(report);

  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 400 });
  }

  const memorySummary = mergeMemorySummary(session.identity.memorySummary, {
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    nextPractice: report.nextPractice,
  });

  await prisma.identity.update({
    where: { id: session.identityId },
    data: { memorySummary },
  });

  const updated = await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      reportJson: JSON.stringify(report),
      summary: report.summary,
    },
  });

  return NextResponse.json({ session: updated, report });
}
