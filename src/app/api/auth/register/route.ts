import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPrisma } from "@/lib/db/prisma";
import { authRegisterSchema } from "@/lib/domain/schemas";
import { sanitizeUser, setAuthSessionCookie } from "@/lib/auth/http";
import { hashPassword } from "@/lib/security/secrets";

export async function POST(request: Request) {
  const body = authRegisterSchema.parse(await request.json());
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email: body.email } });

  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
  }

  const { passwordHash, passwordSalt } = hashPassword(body.password);
  const user = await prisma.user.create({
    data: {
      id: nanoid(),
      email: body.email,
      name: body.name ?? null,
      passwordHash,
      passwordSalt,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  const response = NextResponse.json({ user: sanitizeUser(user) });
  setAuthSessionCookie(response, user.id);
  return response;
}
