import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { authLoginSchema } from "@/lib/domain/schemas";
import { sanitizeUser, setAuthSessionCookie } from "@/lib/auth/http";
import { verifyPassword } from "@/lib/security/secrets";

export async function POST(request: Request) {
  const body = authLoginSchema.parse(await request.json());
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: body.email } });

  if (!user || !verifyPassword(body.password, user.passwordHash, user.passwordSalt)) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const response = NextResponse.json({ user: sanitizeUser(user) });
  setAuthSessionCookie(response, user.id);
  return response;
}
