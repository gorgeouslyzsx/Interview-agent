"use client";

import { useRouter } from "next/navigation";
import { RoleSwitch } from "@/components/interview/role-switch";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6">
      <p className="text-sm font-medium text-blue-600">Interview Agent</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-normal text-gray-950">开始一次模拟面试</h1>
      <div className="mt-8">
        <RoleSwitch onSelect={(role) => router.push(`/interview/new?role=${role}`)} />
      </div>
    </main>
  );
}
