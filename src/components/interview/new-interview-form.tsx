"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { JDPanel } from "@/components/interview/jd-panel";
import { InterviewConfigPanel } from "@/components/interview/interview-config-panel";
import type { Difficulty, InterviewStyle, UserRole } from "@/lib/domain/types";

type NewInterviewFormProps = {
  initialRole: UserRole;
};

const DEFAULT_JD = "岗位：Java 后端工程师\n要求：熟悉 Java、Spring Boot、MySQL、Redis。\n职责：负责业务系统开发，参与接口设计和性能优化。\n年限：3 年以上经验。";
const DEFAULT_CANDIDATE = {
  name: "Java 后端三年经验",
  profile: "有三年 Java 后端经验，熟悉业务开发，希望提升 Redis 和系统设计表达。",
};
const DEFAULT_AI_CANDIDATE = {
  name: "三年后端候选人",
  profile: "候选人有三年 Java 后端经验，项目经验较多，但 Redis 细节和系统设计表达一般。",
};

export function NewInterviewForm({ initialRole }: NewInterviewFormProps) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole>(initialRole);
  const initialIdentity = userRole === "candidate" ? DEFAULT_CANDIDATE : DEFAULT_AI_CANDIDATE;
  const [name, setName] = useState(initialIdentity.name);
  const [profile, setProfile] = useState(initialIdentity.profile);
  const [jd, setJd] = useState(DEFAULT_JD);
  const [style, setStyle] = useState<InterviewStyle>("normal");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  async function startInterview() {
    setIsStarting(true);
    setError("");

    try {
      const identityRes = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: userRole === "candidate" ? "candidate_practice" : "interviewer_practice",
          name,
          profile,
        }),
      });
      const identityData = await identityRes.json();
      if (!identityRes.ok) throw new Error(identityData.error ?? "身份创建失败");

      const jdRes = await fetch("/api/jds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: jd }),
      });
      const jdData = await jdRes.json();
      if (!jdRes.ok) throw new Error(jdData.error ?? "JD 解析失败");

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole,
          identityId: identityData.identity.id,
          jdId: jdData.jd.id,
          style,
          difficulty,
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error ?? "会话创建失败");

      router.push(`/interview/${sessionData.session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "启动失败");
    } finally {
      setIsStarting(false);
    }
  }

  function changeRole(nextRole: UserRole) {
    setUserRole(nextRole);
    const nextIdentity = nextRole === "candidate" ? DEFAULT_CANDIDATE : DEFAULT_AI_CANDIDATE;
    setName(nextIdentity.name);
    setProfile(nextIdentity.profile);
  }

  return (
    <div className="grid min-h-screen gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
      <section className="mx-auto w-full max-w-3xl space-y-5">
        <div>
          <p className="text-sm font-medium text-blue-600">配置</p>
          <h1 className="mt-2 text-2xl font-semibold">创建模拟面试</h1>
        </div>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold">角色</h2>
          <div className="mt-3 flex gap-2">
            <Button variant={userRole === "candidate" ? "primary" : "secondary"} onClick={() => changeRole("candidate")}>
              我是面试人员
            </Button>
            <Button
              variant={userRole === "interviewer" ? "primary" : "secondary"}
              onClick={() => changeRole("interviewer")}
            >
              我是面试官
            </Button>
          </div>
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold">身份</h2>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
          />
          <textarea
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
            className="mt-3 min-h-24 w-full resize-y rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-blue-400"
          />
        </section>
        <JDPanel value={jd} onChange={setJd} />
        <InterviewConfigPanel
          userRole={userRole}
          style={style}
          difficulty={difficulty}
          onStyleChange={setStyle}
          onDifficultyChange={setDifficulty}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button onClick={startInterview} disabled={isStarting}>
          {isStarting ? "启动中" : "开始面试"}
        </Button>
      </section>
      <aside className="h-fit rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold">当前上下文</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-gray-500">
          <p>角色：{userRole === "candidate" ? "面试人员" : "面试官"}</p>
          <p>身份：{name}</p>
          <p>风格：{userRole === "candidate" ? style : "模拟候选人"}</p>
          <p>难度：{userRole === "candidate" ? difficulty : "按身份表现"}</p>
        </div>
      </aside>
    </div>
  );
}
