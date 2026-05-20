"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { RoleSwitch } from "@/components/interview/role-switch";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
      <div className="mb-10 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-blue-600">Interview Agent</p>
        <Link className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700" href="/login">
          登录 / 注册
        </Link>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-gray-950">开始一次模拟面试</h1>
      <div className="mt-8">
        <RoleSwitch onSelect={(role) => router.push(`/identities?role=${role}`)} />
      </div>
    </main>
  );
}
