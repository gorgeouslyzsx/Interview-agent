const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/health"];
const PUBLIC_PAGE_PATHS = new Set(["/", "/login"]);

export function isPublicRoute(pathname: string) {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix));
}
