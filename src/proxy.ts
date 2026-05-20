import { NextResponse, type NextRequest } from "next/server";
import { readUserSessionFromCookie } from "@/lib/auth/session";
import { isPublicRoute } from "@/lib/auth/routes";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = readUserSessionFromCookie(request.headers.get("cookie"));

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!session && !isPublicRoute(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)"],
};
