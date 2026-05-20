import { describe, expect, it } from "vitest";
import {
  AUTH_SESSION_COOKIE,
  createUserSessionToken,
  readUserSessionFromCookie,
  verifyUserSessionToken,
} from "@/lib/auth/session";

describe("user auth session tokens", () => {
  it("creates signed user tokens that reject tampering and wrong secrets", () => {
    const token = createUserSessionToken("user-1", {
      now: new Date("2026-05-19T00:00:00.000Z"),
      secret: "secret-for-tests",
    });

    expect(verifyUserSessionToken(token, { secret: "secret-for-tests" })?.userId).toBe("user-1");
    expect(verifyUserSessionToken(`${token}x`, { secret: "secret-for-tests" })).toBeNull();
    expect(verifyUserSessionToken(token, { secret: "different-secret" })).toBeNull();
  });

  it("rejects expired user tokens", () => {
    const token = createUserSessionToken("user-1", {
      now: new Date("2026-05-01T00:00:00.000Z"),
      secret: "secret-for-tests",
      ttlMs: 1000,
    });

    expect(
      verifyUserSessionToken(token, {
        now: new Date("2026-05-01T00:00:02.000Z"),
        secret: "secret-for-tests",
      }),
    ).toBeNull();
  });

  it("reads the user session from the request cookie header", () => {
    const token = createUserSessionToken("user-1", {
      now: new Date("2026-05-19T00:00:00.000Z"),
      secret: "secret-for-tests",
    });

    expect(
      readUserSessionFromCookie(`theme=light; ${AUTH_SESSION_COOKIE}=${encodeURIComponent(token)}`, {
        secret: "secret-for-tests",
      })?.userId,
    ).toBe("user-1");
  });
});
