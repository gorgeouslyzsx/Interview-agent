type MemorySignals = {
  strengths: string[];
  weaknesses: string[];
  nextPractice: string[];
};

export function mergeMemorySummary(existing: string, signals: MemorySignals): string {
  const parts = [
    existing.trim(),
    signals.strengths.length ? `强项：${signals.strengths.join("；")}` : "",
    signals.weaknesses.length ? `薄弱点：${signals.weaknesses.join("；")}` : "",
    signals.nextPractice.length ? `建议练习：${signals.nextPractice.join("；")}` : "",
  ].filter(Boolean);

  return Array.from(new Set(parts)).join("\n");
}
