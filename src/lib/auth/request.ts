import { readUserSessionFromCookie } from "@/lib/auth/session";

export function getRequestUserId(request: Request) {
  return readUserSessionFromCookie(request.headers.get("cookie"))?.userId ?? null;
}
