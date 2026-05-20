import { describe, expect, it } from "vitest";
import { isPublicRoute } from "@/lib/auth/routes";

describe("auth route policy", () => {
  it("allows landing, login, auth endpoints, and health checks without a session", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/api/auth/login")).toBe(true);
    expect(isPublicRoute("/api/auth/register")).toBe(true);
    expect(isPublicRoute("/api/health")).toBe(true);
  });

  it("requires a session for interview data pages and business APIs", () => {
    expect(isPublicRoute("/identities")).toBe(false);
    expect(isPublicRoute("/interview/session-1")).toBe(false);
    expect(isPublicRoute("/api/identities")).toBe(false);
    expect(isPublicRoute("/api/files/extract-text")).toBe(false);
  });
});
