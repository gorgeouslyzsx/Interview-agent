import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { createSessionSchema } from "@/lib/domain/schemas";
import { createOpenAICompatibleClient } from "@/lib/llm/client";
import { createOpeningQuestion, strictnessFromDifficulty } from "@/lib/planning/interview-planner";
import { generateInitialInterviewPlanWithLLM } from "@/lib/planning/llm-planner";
import { decryptSecret } from "@/lib/security/secrets";
import { getRequestUserId } from "@/lib/auth/request";
import { reviewUploadedContent } from "@/lib/guardrails/guardrail";
import {
  createIdentityAccessToken,
  hasIdentityAccess,
  IDENTITY_ACCESS_COOKIE,
} from "@/lib/security/identity-access";

export async function POST(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = createSessionSchema.parse(await request.json());
  const aiRole = body.userRole === "candidate" ? "interviewer" : "candidate";
  const prisma = getPrisma();
  const identity = await prisma.identity.findFirst({ where: { id: body.identityId, userId } });

  if (!identity) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }
  if (
    identity.passwordHash &&
    identity.passwordSalt &&
    !hasIdentityAccess(request.headers.get("cookie"), identity.id)
  ) {
    return NextResponse.json({ error: "请先通过身份密码验证" }, { status: 401 });
  }

  const jdId = body.jdId ?? identity.jdId;
  const jd = jdId ? await prisma.jdProfile.findFirst({ where: { id: jdId, userId } }) : null;
  if (jdId && !jd) {
    return NextResponse.json({ error: "JD not found" }, { status: 404 });
  }

  const jdReview = jd?.rawText ? reviewUploadedContent(jd.rawText, "JD") : undefined;
  const resumeSource = body.resumeText ?? identity.resumeText ?? "";
  const resumeReview = resumeSource ? reviewUploadedContent(resumeSource, "简历") : undefined;
  const warnings = [...(jdReview?.findings ?? []), ...(resumeReview?.findings ?? [])];
  const notice = [jdReview?.notice, resumeReview?.notice].filter(Boolean).join("；") || undefined;
  const strictness = strictnessFromDifficulty(body.difficulty);
  const initialPlan = await generateInitialInterviewPlanWithLLM({
    jdSummary: jdReview?.sanitizedText ?? "",
    identityMemory: identity.memorySummary,
    targetRole: jd?.title ?? "目标岗位",
    strictness,
    interviewStyle: body.style ?? "normal",
    historicalWeaknesses: identity.memorySummary ? [identity.memorySummary] : [],
    llm: createOpenAICompatibleClient({
      apiKey: decryptSecret(identity.llmApiKeyEncrypted),
      baseUrl: identity.llmBaseUrl,
      model: identity.llmModel,
    }),
  });

  const session = await prisma.interviewSession.create({
    data: {
      id: nanoid(),
      userId: identity.userId,
      userRole: body.userRole,
      aiRole,
      identityId: body.identityId,
      jdId,
      resumeText: resumeReview?.sanitizedText,
      style: body.userRole === "candidate" ? body.style : null,
      difficulty: body.userRole === "candidate" ? body.difficulty : null,
      initialPlanJson: JSON.stringify(initialPlan),
      currentStageId: initialPlan.stages[0]?.stage_id,
    },
  });
  if (body.userRole === "candidate") {
    await prisma.message.create({
      data: {
        id: nanoid(),
        sessionId: session.id,
        role: "assistant",
        content: createOpeningQuestion(initialPlan),
      },
    });
  }

  const response = NextResponse.json(warnings.length > 0 ? { session, warnings, notice } : { session });
  response.cookies.set(IDENTITY_ACCESS_COOKIE, createIdentityAccessToken(identity.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

export async function GET(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const identityId = searchParams.get("identityId") ?? undefined;
  if (!identityId) {
    return NextResponse.json({ error: "请先选择身份" }, { status: 400 });
  }

  const prisma = getPrisma();
  const identity = await prisma.identity.findFirst({
    where: { id: identityId, userId },
    select: { id: true, passwordHash: true, passwordSalt: true },
  });
  if (!identity) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }
  if (identity.passwordHash && identity.passwordSalt && !hasIdentityAccess(request.headers.get("cookie"), identityId)) {
    return NextResponse.json({ error: "请先通过身份验证" }, { status: 401 });
  }
  const sessions = await prisma.interviewSession.findMany({
    where: {
      userId,
      identityId,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ sessions });
}
