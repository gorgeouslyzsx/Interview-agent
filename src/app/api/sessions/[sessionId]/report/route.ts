import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { createReportFromTranscript, parseStoredReport } from "@/lib/evaluation/report";
import { validateEvidenceBasedReport } from "@/lib/guardrails/guardrail";
import { mergeMemorySummary } from "@/lib/memory/memory-service";
import { parseJsonArray } from "@/lib/domain/json";
import { getRequestUserId } from "@/lib/auth/request";
import { hasIdentityAccess } from "@/lib/security/identity-access";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

async function findAuthorizedSession(request: Request, sessionId: string) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return { error: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  }

  const prisma = getPrisma();
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      identity: true,
      jd: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) };
  }

  if (
    session.identity.passwordHash &&
    session.identity.passwordSalt &&
    !hasIdentityAccess(request.headers.get("cookie"), session.identityId)
  ) {
    return { error: NextResponse.json({ error: "请先通过身份验证" }, { status: 401 }) };
  }

  return { session };
}

export async function GET(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const result = await findAuthorizedSession(request, sessionId);

  if (result.error) return result.error;

  return NextResponse.json({
    report: parseStoredReport(result.session.reportJson),
    status: result.session.status,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const prisma = getPrisma();
  const result = await findAuthorizedSession(request, sessionId);

  if (result.error) return result.error;

  const { session } = result;
  const existingReport = parseStoredReport(session.reportJson);
  if (existingReport) {
    return NextResponse.json({ session, report: existingReport, reused: true });
  }

  const transcript = session.messages.map((message) => `${message.role}: ${message.content}`).join("\n");
  const report = createReportFromTranscript(transcript, {
    jdSkills: parseJsonArray<string>(session.jd?.skillsJson),
    targetRole: session.jd?.title ?? undefined,
  });
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
