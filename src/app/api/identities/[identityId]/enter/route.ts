import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { enterIdentitySchema } from "@/lib/domain/schemas";
import { getUserRoleForIdentityMode } from "@/lib/identities/identity-flow";
import type { IdentityMode } from "@/lib/domain/types";
import { createOpenAICompatibleClient } from "@/lib/llm/client";
import { createOpeningQuestion, strictnessFromDifficulty } from "@/lib/planning/interview-planner";
import { generateInitialInterviewPlanWithLLM } from "@/lib/planning/llm-planner";
import { decryptSecret, verifyPassword } from "@/lib/security/secrets";
import { getRequestUserId } from "@/lib/auth/request";
import {
  createIdentityAccessToken,
  hasIdentityAccess,
  IDENTITY_ACCESS_COOKIE,
} from "@/lib/security/identity-access";

type RouteContext = {
  params: Promise<{ identityId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { identityId } = await context.params;
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = enterIdentitySchema.parse(await request.json().catch(() => ({})));
  const prisma = getPrisma();

  const identity = await prisma.identity.findFirst({
    where: { id: identityId, userId },
    include: {
      jd: true,
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!identity) {
    return NextResponse.json({ error: "Identity not found" }, { status: 404 });
  }

  const hasAccess = hasIdentityAccess(request.headers.get("cookie"), identity.id);
  if (identity.passwordHash && identity.passwordSalt && !hasAccess) {
    if (!body.password || !verifyPassword(body.password, identity.passwordHash, identity.passwordSalt)) {
      return NextResponse.json({ error: "身份密码错误或缺失" }, { status: 401 });
    }
  }

  const existingSession = identity.sessions.find((session) => session.status === "active");
  if (existingSession) {
    const response = NextResponse.json({ session: existingSession, created: false });
    response.cookies.set(IDENTITY_ACCESS_COOKIE, createIdentityAccessToken(identity.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  }

  const userRole = getUserRoleForIdentityMode(identity.mode as IdentityMode);
  const aiRole = userRole === "candidate" ? "interviewer" : "candidate";
  const difficulty = userRole === "candidate" ? body.difficulty ?? "medium" : undefined;
  const style = userRole === "candidate" ? body.style ?? "normal" : undefined;
  const initialPlan = await generateInitialInterviewPlanWithLLM({
    jdSummary: identity.jd?.rawText ?? "",
    identityMemory: identity.memorySummary,
    targetRole: identity.jd?.title ?? "目标岗位",
    strictness: strictnessFromDifficulty(difficulty),
    interviewStyle: style ?? "normal",
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
      userRole,
      aiRole,
      identityId: identity.id,
      jdId: identity.jdId,
      resumeText: identity.resumeText,
      style: style ?? null,
      difficulty: difficulty ?? null,
      initialPlanJson: JSON.stringify(initialPlan),
      currentStageId: initialPlan.stages[0]?.stage_id,
    },
  });
  if (userRole === "candidate") {
    await prisma.message.create({
      data: {
        id: nanoid(),
        sessionId: session.id,
        role: "assistant",
        content: createOpeningQuestion(initialPlan),
      },
    });
  }

  const response = NextResponse.json({ session, created: true });
  response.cookies.set(IDENTITY_ACCESS_COOKIE, createIdentityAccessToken(identity.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
