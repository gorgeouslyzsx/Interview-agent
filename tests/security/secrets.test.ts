import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/security/secrets";

describe("secret encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the deployment fallback secret in production when APP_SECRET is absent", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_SECRET", "");
    vi.stubEnv("INTERVIEW_AGENT_SECRET", "a-production-fallback-secret-with-at-least-32-characters");

    const encrypted = encryptSecret("provider-api-key");

    expect(decryptSecret(encrypted)).toBe("provider-api-key");
  });
});
