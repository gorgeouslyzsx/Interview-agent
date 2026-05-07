type ContextSidePanelProps = {
  jdSummary?: string;
  memorySummary?: string;
  progress?: string;
};

export function ContextSidePanel({ jdSummary, memorySummary, progress }: ContextSidePanelProps) {
  return (
    <aside className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold">JD 摘要</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{jdSummary || "暂无 JD"}</p>
      </div>
      <div className="border-t border-gray-100 pt-4">
        <h2 className="text-sm font-semibold">身份记忆</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{memorySummary || "暂无记忆"}</p>
      </div>
      <div className="border-t border-gray-100 pt-4">
        <h2 className="text-sm font-semibold">进度</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{progress || "准备中"}</p>
      </div>
    </aside>
  );
}
