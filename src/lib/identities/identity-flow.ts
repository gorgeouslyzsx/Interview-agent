import type { IdentityMode, UserRole } from "@/lib/domain/types";

type IdentityProfileInput = {
  mode: IdentityMode;
  name: string;
  jdTitle?: string | null;
  hasResume: boolean;
};

export function getUserRoleForIdentityMode(mode: IdentityMode): UserRole {
  return mode === "candidate_practice" ? "candidate" : "interviewer";
}

export function buildIdentityProfile({ mode, name, jdTitle, hasResume }: IdentityProfileInput): string {
  const roleText =
    mode === "candidate_practice"
      ? "用户正在作为面试人员练习，AI 需要扮演面试官。"
      : "用户正在作为面试官练习，AI 需要扮演模拟候选人。";

  return [
    `姓名：${name}`,
    roleText,
    `目标岗位：${jdTitle || "未识别岗位标题"}`,
    hasResume ? "已上传简历，提问时应结合简历项目经历。" : "未上传简历，提问时主要依据 JD。",
  ].join("\n");
}
