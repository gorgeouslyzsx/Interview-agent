"use client";

import { useEffect, useState } from "react";
import { ReportSummary } from "@/components/interview/report-summary";
import type { InterviewReport } from "@/lib/domain/types";

type ReportClientProps = {
  sessionId: string;
};

export function ReportClient({ sessionId }: ReportClientProps) {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/report`, {
          method: "POST",
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? "生成失败");
          return;
        }

        setReport(data.report);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError("生成失败");
      }
    }

    loadReport();

    return () => controller.abort();
  }, [sessionId]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <p className="text-sm font-medium text-blue-600">复盘报告</p>
      <h1 className="mt-2 text-2xl font-semibold">本次面试结果</h1>
      <div className="mt-6">
        {error ? <p className="rounded-lg border border-red-200 bg-white p-4 text-sm text-red-600">{error}</p> : null}
        {!error && !report ? <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">生成中</div> : null}
        {report ? <ReportSummary report={report} /> : null}
      </div>
    </main>
  );
}
