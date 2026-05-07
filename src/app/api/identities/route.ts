import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { identitySchema } from "@/lib/domain/schemas";

const DEMO_USER_ID = "demo-user";

export async function GET() {
  const prisma = getPrisma();
  const identities = await prisma.identity.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ identities });
}

export async function POST(request: Request) {
  const body = identitySchema.parse(await request.json());
  const prisma = getPrisma();
  const identity = await prisma.identity.create({
    data: {
      id: nanoid(),
      userId: DEMO_USER_ID,
      mode: body.mode,
      name: body.name,
      profile: body.profile,
    },
  });

  return NextResponse.json({ identity });
}
