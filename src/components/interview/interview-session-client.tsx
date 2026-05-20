"use client";

import Link from "next/link";
import { useState } from "react";
import { ChatPanel } from "@/components/interview/chat-panel";
import { ContextSidePanel } from "@/components/interview/context-side-panel";

type InterviewSessionClientProps = {
  sessionId: string;
  identityName: string;
  userRole: string;
  initialMessages: { role: string; content: string }[];
  initialCacheUsage?: {
    promptTokens: number;
    cachedTokens: number;
    estimatedSavedPromptTokens: number;
    cacheHitRate: number;
  };
  jdSummary?: string | null;
  memorySummary?: string | null;
};

function formatCacheStats(usage?: InterviewSessionClientProps["initialCacheUsage"]) {
  if (!usage) return "暂无缓存数据";

  const rate = Math.round((usage.cacheHitRate ?? 0) * 100);
  return `缓存命中 ${usage.cachedTokens ?? 0}/${usage.promptTokens ?? 0} tokens，计费等价节省 ${
    usage.estimatedSavedPromptTokens ?? 0
  } prompt tokens，命中率 ${rate}%`;
}

export function InterviewSessionClient({
  sessionId,
  identityName,
  userRole,
  initialMessages,
  initialCacheUsage,
  jdSummary,
  memorySummary,
}: InterviewSessionClientProps) {
  const [messages, setMessages] = useState(
    initialMessages.length > 0 ? initialMessages : [{ role: "assistant", content: "我们开始吧。你可以先发起第一轮对话。" }],
  );
  const [cacheStats, setCacheStats] = useState(formatCacheStats(initialCacheUsage));
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const nextInput = input;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: nextInput }]);
    setIsSending(true);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextInput }),
      });
      const data = await response.json();
      if (data.usage) {
        setCacheStats(formatCacheStats(data.usage));
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.ok ? data.message.content : data.error ?? "发送失败" },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="grid min-h-screen gap-4 p-4 lg:grid-cols-[260px_1fr_320px]">
      <aside className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-blue-600">Interview Agent</p>
        <h1 className="mt-2 text-lg font-semibold">{identityName}</h1>
        <div className="mt-6 space-y-2">
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700"
            href={`/identities?role=${userRole}`}
          >
            返回身份
          </Link>
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white"
            href={`/interview/${sessionId}/report`}
          >
            生成复盘
          </Link>
        </div>
      </aside>
      <ChatPanel
        messages={isSending ? [...messages, { role: "assistant", content: "思考中..." }] : messages}
        input={input}
        onInput={setInput}
        onSend={send}
      />
      <ContextSidePanel
        jdSummary={jdSummary || "暂无 JD"}
        progress={`${Math.max(messages.length - 1, 0)} 条消息；${cacheStats}`}
        memorySummary={memorySummary || "暂无记忆"}
      />
    </main>
  );
}
