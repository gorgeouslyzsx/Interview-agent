"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { FileText, KeyRound, Loader2, LockKeyhole, Plus, Server, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IdentityCard } from "@/components/interview/identity-card";
import type { IdentityMode, UserRole } from "@/lib/domain/types";
import { LLM_PROVIDER_PRESETS } from "@/lib/llm/provider-presets";
import { reviewUploadedContent } from "@/lib/guardrails/guardrail";

type IdentityRecord = {
  id: string;
  name: string;
  profile: string;
  mode: IdentityMode;
  username?: string | null;
  resumeText?: string | null;
  hasResume?: boolean;
  requiresPassword?: boolean;
  llmProvider?: string | null;
  llmBaseUrl?: string | null;
  llmModel?: string | null;
  hasApiKey?: boolean;
  jd?: {
    title?: string | null;
  } | null;
  sessions?: Array<{
    id: string;
    status: string;
    updatedAt: string;
  }>;
};

type IdentitySelectionClientProps = {
  userRole: UserRole;
};

const DEFAULT_JD =
  "岗位：Java 后端工程师\n要求：熟悉 Java、Spring Boot、MySQL、Redis，能结合项目经验说明技术取舍。";
const DEFAULT_PROVIDER = LLM_PROVIDER_PRESETS[0];

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

export function IdentitySelectionClient({ userRole }: IdentitySelectionClientProps) {
  const router = useRouter();
  const mode: IdentityMode = userRole === "candidate" ? "candidate_practice" : "interviewer_practice";
  const [identities, setIdentities] = useState<IdentityRecord[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [jdRawText, setJdRawText] = useState(DEFAULT_JD);
  const [resumeText, setResumeText] = useState("");
  const [llmProvider, setLlmProvider] = useState<string>(DEFAULT_PROVIDER.id);
  const [llmBaseUrl, setLlmBaseUrl] = useState<string>(DEFAULT_PROVIDER.baseUrl);
  const [llmModel, setLlmModel] = useState<string>(DEFAULT_PROVIDER.models[0]);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyLabel, setBusyLabel] = useState("");

  useEffect(() => {
    async function loadIdentities() {
      const response = await fetch(`/api/identities?mode=${mode}`);
      const data = await response.json();
      setIdentities(data.identities ?? []);
    }

    loadIdentities();
  }, [mode]);

  async function enterIdentity(identity: IdentityRecord, knownPassword?: string) {
    const identityPassword =
      knownPassword ??
      (identity.requiresPassword ? window.prompt(`请输入身份「${identity.name}」的密码`) ?? "" : undefined);
    if (identity.requiresPassword && !identityPassword) {
      setError("请输入身份密码");
      return;
    }

    setBusyLabel("进入中");
    setError("");

    try {
      const response = await fetch(`/api/identities/${identity.id}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: identityPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "进入面试失败");

      router.push(`/interview/${data.session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "进入面试失败");
      setBusyLabel("");
    }
  }

  async function createIdentity() {
    if (!name.trim()) {
      setError("请填写姓名");
      return;
    }
    if (!username.trim() || password.length < 6) {
      setError("请填写用户名，并设置至少 6 位密码");
      return;
    }
    if (!llmApiKey.trim()) {
      setError("请填写模型 API Key");
      return;
    }

    const jdReview = reviewUploadedContent(jdRawText, "JD");
    const resumeReview = resumeText ? reviewUploadedContent(resumeText, "简历") : undefined;
    const uploadNotice = [jdReview.notice, resumeReview?.notice].filter(Boolean).join("；");
    const safeJdRawText = jdReview.sanitizedText;
    const safeResumeText = resumeReview?.sanitizedText;

    setBusyLabel("创建中");
    setError("");
    setNotice(uploadNotice);

    try {
      const response = await fetch("/api/identities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          username,
          password,
          name,
          jdRawText: safeJdRawText,
          resumeText: safeResumeText,
          llmProvider,
          llmBaseUrl,
          llmModel,
          llmApiKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "创建身份失败");
      if (!uploadNotice && data.notice) setNotice(data.notice);

      setIdentities((current) => [data.identity, ...current]);
      await enterIdentity(data.identity, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建身份失败");
      setBusyLabel("");
    }
  }

  function applyProviderPreset(providerId: string) {
    const preset = LLM_PROVIDER_PRESETS.find((provider) => provider.id === providerId);
    if (!preset) return;

    setLlmProvider(preset.id);
    setLlmBaseUrl(preset.baseUrl);
    setLlmModel(preset.models[0]);
  }

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

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">身份</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {userRole === "candidate" ? "请选择你的身份" : "请选择模拟候选人身份"}
          </h1>
        </div>
          {busyLabel ? (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {busyLabel}
            </span>
          ) : null}
      </div>

      {notice ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{notice}</p> : null}

      <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {identities.map((identity) => (
            <button
              key={identity.id}
              type="button"
              onClick={() => enterIdentity(identity)}
              className="block min-h-36"
              disabled={Boolean(busyLabel)}
            >
              <IdentityCard
                name={identity.name}
                profile={identity.profile}
                jdTitle={identity.jd?.title}
                hasResume={Boolean(identity.hasResume || identity.resumeText)}
                llmModel={identity.llmModel}
                lastSessionStatus={identity.sessions?.[0]?.status}
              />
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 transition hover:border-blue-300 hover:text-blue-600"
            disabled={Boolean(busyLabel)}
          >
            <Plus className="h-7 w-7" />
            <span className="mt-3 text-sm font-medium">创建身份</span>
          </button>
        </div>
      </section>

      {showCreateForm ? (
        <section className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-white p-5 lg:grid-cols-[220px_1fr]">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserRound className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold">创建身份</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              设置访问凭据、模型配置、JD 和简历后会直接进入面试聊天。
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">用户名</span>
                <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blue-400">
                  <UserRound className="h-4 w-4 text-gray-400" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-full flex-1 bg-transparent text-sm outline-none"
                    placeholder="例如：linyi"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">密码</span>
                <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blue-400">
                  <LockKeyhole className="h-4 w-4 text-gray-400" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-full flex-1 bg-transparent text-sm outline-none"
                    placeholder="至少 6 位"
                    type="password"
                  />
                </div>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">姓名</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
                placeholder="例如：林一"
              />
            </label>

            <section className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-800">模型配置</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {LLM_PROVIDER_PRESETS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => applyProviderPreset(provider.id)}
                    className={
                      provider.id === llmProvider
                        ? "rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                        : "rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-blue-300"
                    }
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Base URL</span>
                  <input
                    value={llmBaseUrl}
                    onChange={(event) => setLlmBaseUrl(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
                    placeholder="https://api.openai.com/v1"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Model</span>
                  <input
                    value={llmModel}
                    onChange={(event) => setLlmModel(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-400"
                    list="llm-model-presets"
                    placeholder={DEFAULT_PROVIDER.models[0]}
                  />
                  <datalist id="llm-model-presets">
                    {LLM_PROVIDER_PRESETS.flatMap((provider) =>
                      provider.models.map((model) => <option key={`${provider.id}-${model}`} value={model} />),
                    )}
                  </datalist>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-gray-700">API Key</span>
                <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blue-400">
                  <KeyRound className="h-4 w-4 text-gray-400" />
                  <input
                    value={llmApiKey}
                    onChange={(event) => setLlmApiKey(event.target.value)}
                    className="h-full flex-1 bg-transparent text-sm outline-none"
                    placeholder="只用于该身份的模型调用"
                    type="password"
                  />
                </div>
              </label>
            </section>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">JD</span>
              <textarea
                value={jdRawText}
                onChange={(event) => setJdRawText(event.target.value)}
                className="mt-2 min-h-36 w-full resize-y rounded-lg border border-gray-200 p-3 text-sm leading-6 outline-none focus:border-blue-400"
                placeholder="粘贴目标岗位 JD"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-gray-700">简历 PDF</span>
              <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-500 hover:border-blue-300">
                <FileText className="h-4 w-4" />
                <span>{resumeText ? `已解析 ${resumeText.length} 字` : "上传 PDF 简历"}</span>
                <input className="hidden" type="file" accept="application/pdf,.pdf" onChange={loadResume} />
              </label>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowCreateForm(false)} disabled={Boolean(busyLabel)}>
                取消
              </Button>
              <Button onClick={createIdentity} disabled={Boolean(busyLabel)}>
                {busyLabel ? "处理中" : "创建并开始"}
              </Button>
            </div>
          </div>
        </section>
      ) : error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}
    </main>
  );
}
