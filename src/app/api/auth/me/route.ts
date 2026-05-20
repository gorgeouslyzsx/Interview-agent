import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/request";
import { getPrisma } from "@/lib/db/prisma";
import { sanitizeUser } from "@/lib/auth/http";

export async function GET(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: sanitizeUser(user) });
}
