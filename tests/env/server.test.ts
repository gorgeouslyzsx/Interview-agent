import { describe, expect, it } from "vitest";
import { validateServerEnv } from "@/lib/env/server";

describe("server environment validation", () => {
  it("accepts a production PostgreSQL configuration with a strong app secret", () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://interview:secret@db:5432/interview_agent",
        APP_SECRET: "a-production-secret-with-at-least-32-characters",
      }),
    ).not.toThrow();
  });

  it("accepts the deployment fallback secret when APP_SECRET is absent", () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://interview:secret@db:5432/interview_agent",
        INTERVIEW_AGENT_SECRET: "a-production-fallback-secret-with-at-least-32-characters",
      }),
    ).not.toThrow();
  });

  it("rejects production SQLite and placeholder secrets", () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "file:./dev.db",
        APP_SECRET: "replace-with-a-long-random-secret",
      }),
    ).toThrow(/DATABASE_URL/);

    expect(() =>
      validateServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://interview:secret@db:5432/interview_agent",
        APP_SECRET: "replace-with-a-long-random-secret",
      }),
    ).toThrow(/APP_SECRET/);
  });
});
