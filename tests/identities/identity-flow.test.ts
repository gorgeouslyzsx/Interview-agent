import { describe, expect, it } from "vitest";
import { buildIdentityProfile, getUserRoleForIdentityMode } from "@/lib/identities/identity-flow";

describe("identity flow helpers", () => {
  it("maps candidate practice identities to candidate chat sessions", () => {
    expect(getUserRoleForIdentityMode("candidate_practice")).toBe("candidate");
    expect(getUserRoleForIdentityMode("interviewer_practice")).toBe("interviewer");
  });

  it("builds a model-facing profile from the minimal identity form", () => {
    const profile = buildIdentityProfile({
      mode: "candidate_practice",
      name: "林一",
      jdTitle: "Java 后端工程师",
      hasResume: true,
    });

    expect(profile).toContain("姓名：林一");
    expect(profile).toContain("用户正在作为面试人员练习");
    expect(profile).toContain("Java 后端工程师");
    expect(profile).toContain("已上传简历");
  });
});
