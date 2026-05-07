"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/interview/chat-panel";
import { ContextSidePanel } from "@/components/interview/context-side-panel";

type InterviewSessionClientProps = {
  sessionId: string;
};

export function InterviewSessionClient({ sessionId }: InterviewSessionClientProps) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "我们开始吧。你可以先发起第一轮对话。" },
  ]);
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
        <h1 className="mt-2 text-lg font-semibold">模拟面试</h1>
        <div className="mt-6 space-y-2">
          <Button variant="secondary" className="w-full" onClick={() => setMessages([{ role: "assistant", content: "新一轮开始。" }])}>
            重置聊天
          </Button>
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
      <ContextSidePanel progress={`${Math.max(messages.length - 1, 0)} 条消息`} />
    </main>
  );
}
