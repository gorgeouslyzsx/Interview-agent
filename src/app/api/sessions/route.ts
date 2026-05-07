import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { createSessionSchema } from "@/lib/domain/schemas";

const DEMO_USER_ID = "demo-user";

export async function POST(request: Request) {
  const body = createSessionSchema.parse(await request.json());
  const aiRole = body.userRole === "candidate" ? "interviewer" : "candidate";
  const prisma = getPrisma();

  const session = await prisma.interviewSession.create({
    data: {
      id: nanoid(),
      userId: DEMO_USER_ID,
      userRole: body.userRole,
      aiRole,
      identityId: body.identityId,
      jdId: body.jdId,
      style: body.userRole === "candidate" ? body.style : null,
      difficulty: body.userRole === "candidate" ? body.difficulty : null,
    },
  });

  return NextResponse.json({ session });
}
