"use client";

import { UserRound, UsersRound } from "lucide-react";

type RoleSwitchProps = {
  onSelect: (role: "candidate" | "interviewer") => void;
};

export function RoleSwitch({ onSelect }: RoleSwitchProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <button
        onClick={() => onSelect("candidate")}
        className="rounded-lg border border-gray-200 bg-white p-6 text-left transition hover:border-blue-300 hover:bg-blue-50"
      >
        <UserRound className="mb-4 h-6 w-6 text-blue-600" />
        <h2 className="text-lg font-semibold">我是面试人员</h2>
        <p className="mt-2 text-sm text-gray-500">回答问题，完成复盘。</p>
      </button>
      <button
        onClick={() => onSelect("interviewer")}
        className="rounded-lg border border-gray-200 bg-white p-6 text-left transition hover:border-blue-300 hover:bg-blue-50"
      >
        <UsersRound className="mb-4 h-6 w-6 text-blue-600" />
        <h2 className="text-lg font-semibold">我是面试官</h2>
        <p className="mt-2 text-sm text-gray-500">提出问题，观察回答。</p>
      </button>
    </div>
  );
}
