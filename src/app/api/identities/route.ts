import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { identitySchema } from "@/lib/domain/schemas";
import { parseJD } from "@/lib/jd/parser";
import { reviewUploadedContent } from "@/lib/guardrails/guardrail";
import { buildIdentityProfile } from "@/lib/identities/identity-flow";
import { encryptSecret, hashPassword } from "@/lib/security/secrets";
import { getRequestUserId } from "@/lib/auth/request";
import {
  createIdentityAccessToken,
  IDENTITY_ACCESS_COOKIE,
  isAllowedLLMBaseUrl,
} from "@/lib/security/identity-access";

type IdentityWithSafeRelations = {
  id: string;
  userId: string;
  mode: string;
  username: string | null;
  passwordHash?: string | null;
  name: string;
  profile: string;
  jdId: string | null;
  resumeText?: string | null;
  llmProvider: string | null;
  llmBaseUrl: string | null;
  llmModel: string | null;
  llmApiKeyEncrypted?: string | null;
  memorySummary: string;
  createdAt: Date;
  updatedAt: Date;
  jd: {
    id: string;
    title: string | null;
  } | null;
  sessions: Array<{
    id: string;
    status: string;
    updatedAt: Date;
  }>;
};

function sanitizeIdentity(identity: IdentityWithSafeRelations) {
  const { llmApiKeyEncrypted, passwordHash, resumeText, ...safeIdentity } = identity;
  return {
    ...safeIdentity,
    hasApiKey: Boolean(llmApiKeyEncrypted),
    hasResume: Boolean(resumeText),
    requiresPassword: Boolean(passwordHash),
  };
}

function setIdentityAccessCookie(response: NextResponse, identityId: string) {
  response.cookies.set(IDENTITY_ACCESS_COOKIE, createIdentityAccessToken(identityId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function GET(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? undefined;
  const prisma = getPrisma();
  const identities = await prisma.identity.findMany({
    where: { userId, mode },
    select: {
      id: true,
      userId: true,
      mode: true,
      username: true,
      passwordHash: true,
      name: true,
      profile: true,
      jdId: true,
      resumeText: true,
      llmProvider: true,
      llmBaseUrl: true,
      llmModel: true,
      llmApiKeyEncrypted: true,
      memorySummary: true,
      createdAt: true,
      updatedAt: true,
      jd: {
        select: {
          id: true,
          title: true,
        },
      },
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, status: true, updatedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ identities: identities.map(sanitizeIdentity) });
}

export async function POST(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = identitySchema.parse(await request.json());
  if (!isAllowedLLMBaseUrl(body.llmBaseUrl)) {
    return NextResponse.json({ error: "模型 Base URL 不在允许的供应商列表中" }, { status: 400 });
  }

  const jdReview = reviewUploadedContent(body.jdRawText, "JD");
  const resumeReview = body.resumeText ? reviewUploadedContent(body.resumeText, "简历") : undefined;
  const safeJdRawText = jdReview.sanitizedText;
  const safeResumeText = resumeReview?.sanitizedText;
  const warnings = [...jdReview.findings, ...(resumeReview?.findings ?? [])];
  const notice = [jdReview.notice, resumeReview?.notice].filter(Boolean).join("；") || undefined;

  const parsed = parseJD(safeJdRawText);
  const prisma = getPrisma();
  const existingUsername = await prisma.identity.findUnique({
    where: { userId_username: { userId, username: body.username } },
    select: { id: true },
  });
  if (existingUsername) {
    return NextResponse.json({ error: "该身份用户名已存在" }, { status: 409 });
  }

  const { passwordHash, passwordSalt } = hashPassword(body.password);
  const encryptedApiKey = encryptSecret(body.llmApiKey);
  const identity = await prisma.$transaction(async (tx) => {
    const jd = await tx.jdProfile.create({
      data: {
        id: nanoid(),
        userId,
        rawText: safeJdRawText,
        title: parsed.title,
        skillsJson: JSON.stringify(parsed.skills),
        responsibilitiesJson: JSON.stringify(parsed.responsibilities),
        seniority: parsed.seniority,
        focusAreasJson: JSON.stringify(parsed.focusAreas),
      },
    });

    return tx.identity.create({
      data: {
        id: nanoid(),
        userId,
        mode: body.mode,
        username: body.username,
        passwordHash,
        passwordSalt,
        name: body.name,
        profile:
          body.profile ||
          buildIdentityProfile({
            mode: body.mode,
            name: body.name,
            jdTitle: jd.title,
            hasResume: Boolean(safeResumeText),
          }),
        jdId: jd.id,
        resumeText: safeResumeText,
        llmProvider: body.llmProvider,
        llmBaseUrl: body.llmBaseUrl,
        llmModel: body.llmModel,
        llmApiKeyEncrypted: encryptedApiKey,
      },
      select: {
        id: true,
        userId: true,
        mode: true,
        username: true,
        passwordHash: true,
        name: true,
        profile: true,
        jdId: true,
        resumeText: true,
        llmProvider: true,
        llmBaseUrl: true,
        llmModel: true,
        llmApiKeyEncrypted: true,
        memorySummary: true,
        createdAt: true,
        updatedAt: true,
        jd: { select: { id: true, title: true } },
        sessions: { select: { id: true, status: true, updatedAt: true } },
      },
    });
  });

  const response = NextResponse.json({ identity: sanitizeIdentity(identity), warnings, notice });
  setIdentityAccessCookie(response, identity.id);
  return response;
}
