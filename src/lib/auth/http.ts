import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
  createUserSessionToken,
} from "@/lib/auth/session";

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
};

export function sanitizeUser(user: SafeUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export function setAuthSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(AUTH_SESSION_COOKIE, createUserSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export function clearAuthSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
