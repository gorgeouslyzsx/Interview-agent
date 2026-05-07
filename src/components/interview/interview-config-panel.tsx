"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Difficulty, InterviewStyle, UserRole } from "@/lib/domain/types";

type InterviewConfigPanelProps = {
  userRole: UserRole;
  style: InterviewStyle;
  difficulty: Difficulty;
  onStyleChange: (style: InterviewStyle) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
};

export function InterviewConfigPanel({
  userRole,
  style,
  difficulty,
  onStyleChange,
  onDifficultyChange,
}: InterviewConfigPanelProps) {
  if (userRole === "interviewer") {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold">模拟候选人</h2>
        <p className="mt-2 text-sm text-gray-500">当前模式不需要面试官风格。</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold">面试风格</h2>
        <div className="mt-3">
          <SegmentedControl
            value={style}
            onChange={onStyleChange}
            options={[
              { value: "friendly", label: "友好" },
              { value: "normal", label: "一般" },
              { value: "technical", label: "技术" },
              { value: "pressure", label: "压力" },
            ]}
          />
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold">难度</h2>
        <div className="mt-3">
          <SegmentedControl
            value={difficulty}
            onChange={onDifficultyChange}
            options={[
              { value: "easy", label: "简单" },
              { value: "medium", label: "中等" },
              { value: "hard", label: "困难" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
