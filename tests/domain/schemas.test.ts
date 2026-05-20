import { describe, expect, it } from "vitest";
import { identitySchema } from "@/lib/domain/schemas";

describe("identitySchema", () => {
  it("creates a candidate identity with credentials, model config, JD and optional resume", () => {
    const parsed = identitySchema.parse({
      mode: "candidate_practice",
      username: "linyi",
      password: "passw0rd",
      name: "林一",
      jdRawText: "岗位：Java 后端工程师。要求熟悉 Spring Boot、MySQL、Redis，并能讲清项目经验。",
      resumeText: "三年 Java 后端经验，做过订单系统和 Redis 缓存优化。",
      llmProvider: "glm",
      llmBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
      llmModel: "glm-5",
      llmApiKey: "secret-key",
    });

    expect(parsed.username).toBe("linyi");
    expect(parsed.name).toBe("林一");
    expect(parsed.llmModel).toBe("glm-5");
    expect(parsed.jdRawText).toContain("Java 后端");
    expect(parsed.profile).toBeUndefined();
  });

  it("rejects identities without a meaningful JD", () => {
    const result = identitySchema.safeParse({
      mode: "candidate_practice",
      username: "linyi",
      password: "passw0rd",
      name: "林一",
      jdRawText: "Java",
      llmProvider: "glm",
      llmBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
      llmModel: "glm-5",
      llmApiKey: "secret-key",
    });

    expect(result.success).toBe(false);
  });
});
