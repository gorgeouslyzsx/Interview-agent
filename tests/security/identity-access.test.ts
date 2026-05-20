import { describe, expect, it } from "vitest";
import {
  createIdentityAccessToken,
  isAllowedLLMBaseUrl,
  verifyIdentityAccessToken,
} from "@/lib/security/identity-access";

describe("identity access security", () => {
  it("creates identity-scoped tokens that reject tampering and wrong identities", () => {
    const token = createIdentityAccessToken("identity-1", "secret-for-test");

    expect(verifyIdentityAccessToken(token, "identity-1", "secret-for-test")).toBe(true);
    expect(verifyIdentityAccessToken(token, "identity-2", "secret-for-test")).toBe(false);
    expect(verifyIdentityAccessToken(`${token}x`, "identity-1", "secret-for-test")).toBe(false);
  });

  it("allows known provider URLs and rejects private or unknown model endpoints", () => {
    expect(isAllowedLLMBaseUrl("https://api.openai.com/v1")).toBe(true);
    expect(isAllowedLLMBaseUrl("https://api.deepseek.com")).toBe(true);
    expect(isAllowedLLMBaseUrl("http://127.0.0.1:11434/v1")).toBe(false);
    expect(isAllowedLLMBaseUrl("https://example.com/openai-compatible")).toBe(false);
  });
});
