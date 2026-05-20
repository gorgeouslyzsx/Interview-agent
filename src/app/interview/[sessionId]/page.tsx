import { InterviewSessionClient } from "@/components/interview/interview-session-client";
import { getPrisma } from "@/lib/db/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, verifyUserSessionToken } from "@/lib/auth/session";
import { IDENTITY_ACCESS_COOKIE, verifyIdentityAccessToken } from "@/lib/security/identity-access";

type InterviewSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function InterviewSessionPage({ params }: InterviewSessionPageProps) {
  const { sessionId } = await params;
  const cookieStore = await cookies();
  const userSession = verifyUserSessionToken(cookieStore.get(AUTH_SESSION_COOKIE)?.value);
  if (!userSession) {
    redirect(`/login?next=${encodeURIComponent(`/interview/${sessionId}`)}`);
  }

  const prisma = getPrisma();
  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: userSession.userId },
    include: {
      identity: true,
      jd: true,
      messages: { orderBy: { createdAt: "asc" } },
      usages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!session) {
    notFound();
  }
  const identityAccess = cookieStore.get(IDENTITY_ACCESS_COOKIE)?.value;
  if (
    session.identity.passwordHash &&
    session.identity.passwordSalt &&
    !verifyIdentityAccessToken(identityAccess, session.identityId)
  ) {
    notFound();
  }

  return (
    <InterviewSessionClient
      sessionId={session.id}
      identityName={session.identity.name}
      userRole={session.userRole}
      initialMessages={session.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }))}
      initialCacheUsage={session.usages[0]}
      jdSummary={session.jd?.title ?? session.jd?.rawText?.slice(0, 260)}
      memorySummary={session.identity.memorySummary}
    />
  );
}
