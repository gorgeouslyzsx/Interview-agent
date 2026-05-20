import { describe, expect, it } from "vitest";
import {
  canAppendMessageToSession,
  createBlockedAssistantMessage,
  shouldRequireIdentityPassword,
} from "@/lib/interview/session-policy";

describe("interview session policy", () => {
  it("prevents appending messages to completed sessions", () => {
    expect(canAppendMessageToSession({ status: "active" }).allowed).toBe(true);
    expect(canAppendMessageToSession({ status: "completed" })).toEqual({
      allowed: false,
      reason: "面试已完成，请创建新会话后继续练习",
    });
  });

  it("requires a password when entering a protected identity", () => {
    expect(shouldRequireIdentityPassword({ passwordHash: "hash", passwordSalt: "salt" }, undefined)).toBe(true);
    expect(shouldRequireIdentityPassword({ passwordHash: null, passwordSalt: null }, undefined)).toBe(false);
  });

  it("blocks assistant content that leaks reference answers", () => {
    expect(createBlockedAssistantMessage("参考答案是使用缓存空值").content).toContain("回答触发了安全规则");
  });
});
