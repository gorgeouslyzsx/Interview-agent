"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { JDPanel } from "@/components/interview/jd-panel";
import { InterviewConfigPanel } from "@/components/interview/interview-config-panel";
import type { Difficulty, InterviewStyle, UserRole } from "@/lib/domain/types";
import { reviewUploadedContent } from "@/lib/guardrails/guardrail";

type NewInterviewFormProps = {
  initialRole: UserRole;
  identityId?: string;
};

const DEFAULT_JD = "岗位：Java 后端工程师\n要求：熟悉 Java、Spring Boot、MySQL、Redis。\n职责：负责业务系统开发，参与接口设计和性能优化。\n年限：3 年以上经验。";

async function extractFileText(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/files/extract-text", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "文件解析失败");
  }

  return data.text;
}

export function NewInterviewForm({ initialRole, identityId }: NewInterviewFormProps) {
  const router = useRouter();
  const [jd, setJd] = useState(DEFAULT_JD);
  const [resumeText, setResumeText] = useState("");
  const [style, setStyle] = useState<InterviewStyle>("normal");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const review = reviewUploadedContent(await extractFileText(file), "简历");
      setResumeText(review.sanitizedText);
      setNotice(review.notice ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "简历解析失败");
    }
  }

  async function loadJdFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const review = reviewUploadedContent(await extractFileText(file), "JD");
      setJd(review.sanitizedText);
      setNotice(review.notice ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "JD 文件解析失败");
    }
  }

  async function startInterview() {
    if (!identityId) {
      setError("请先选择身份");
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const jdReview = reviewUploadedContent(jd, "JD");
      const resumeReview = resumeText ? reviewUploadedContent(resumeText, "简历") : undefined;
      const uploadNotice = [jdReview.notice, resumeReview?.notice].filter(Boolean).join("；");
      const safeResumeText = resumeReview?.sanitizedText ?? resumeText;
      setNotice(uploadNotice);

      const jdRes = await fetch("/api/jds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: jdReview.sanitizedText }),
      });
      const jdData = await jdRes.json();
      if (!jdRes.ok) throw new Error(jdData.error ?? "JD 解析失败");
      if (!uploadNotice && jdData.notice) setNotice(jdData.notice);

      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole: initialRole,
          identityId,
          jdId: jdData.jd.id,
          resumeText: safeResumeText,
          style,
          difficulty,
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error ?? "会话创建失败");
      if (!uploadNotice && !jdData.notice && sessionData.notice) setNotice(sessionData.notice);

      router.push(`/interview/${sessionData.session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "启动失败");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="grid min-h-screen gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
      <section className="mx-auto w-full max-w-3xl space-y-5">
        <div>
          <p className="text-sm font-medium text-blue-600">配置</p>
          <h1 className="mt-2 text-2xl font-semibold">创建模拟面试</h1>
          <p className="mt-2 text-sm text-gray-500">
            {identityId ? "已选择身份。补充简历和 JD 后开始一次模拟面试。" : "请先选择身份，再创建模拟面试。"}
          </p>
        </div>
        {!identityId ? (
          <section className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600">
            请先从身份页选择身份。
            <Link className="ml-2 font-medium underline" href={`/identities?role=${initialRole}`}>
              去选择
            </Link>
          </section>
        ) : null}
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold">简历补充</h2>
          <p className="mt-2 text-sm text-gray-500">可上传 PDF/TXT/Markdown，也可以粘贴关键经历。</p>
          <input className="mt-3 text-sm" type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" onChange={loadResume} />
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            className="mt-3 min-h-32 w-full resize-y rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-blue-400"
            placeholder="也可以直接粘贴简历要点"
          />
        </section>
        <section className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold">JD 文件</h2>
            <input className="mt-3 text-sm" type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" onChange={loadJdFile} />
          </div>
          <JDPanel value={jd} onChange={setJd} />
        </section>
        {initialRole === "candidate" ? (
          <InterviewConfigPanel
            userRole={initialRole}
            style={style}
            difficulty={difficulty}
            onStyleChange={setStyle}
            onDifficultyChange={setDifficulty}
          />
        ) : null}
        {notice ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{notice}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button onClick={startInterview} disabled={isStarting || !identityId}>
          {isStarting ? "启动中" : "开始面试"}
        </Button>
      </section>
      <aside className="h-fit rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold">当前上下文</h2>
        <div className="mt-4 space-y-3 text-sm leading-6 text-gray-500">
          <p>角色：{initialRole === "candidate" ? "面试人员" : "面试官"}</p>
          <p>身份：{identityId ? "已选择" : "未选择"}</p>
          <p>简历：{resumeText ? `${resumeText.length} 字` : "未补充"}</p>
          <p>JD：{jd ? `${jd.length} 字` : "未填写"}</p>
        </div>
      </aside>
    </div>
  );
}
