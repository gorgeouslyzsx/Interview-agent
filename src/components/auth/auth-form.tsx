"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";

type Mode = "login" | "register";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const candidate = searchParams.get("next") ?? "/";
    return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
  }, [searchParams]);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError("请填写邮箱");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("请填写姓名");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? { email, password, name }
            : { email, password },
        ),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "认证失败");
      }

      router.push(nextPath);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "认证失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
      <section className="w-full rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Interview Agent</p>
            <h1 className="mt-2 text-2xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>
          </div>
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: "login", label: "登录" },
              { value: "register", label: "注册" },
            ]}
          />
        </div>

        <div className="mt-6 space-y-4">
          {mode === "register" ? (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">姓名</span>
              <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blue-400">
                <UserRound className="h-4 w-4 text-gray-400" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-full flex-1 bg-transparent text-sm outline-none"
                  placeholder="你的姓名"
                />
              </div>
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">邮箱</span>
            <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blue-400">
              <Mail className="h-4 w-4 text-gray-400" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-full flex-1 bg-transparent text-sm outline-none"
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">密码</span>
            <div className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blue-400">
              <KeyRound className="h-4 w-4 text-gray-400" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-full flex-1 bg-transparent text-sm outline-none"
                placeholder="至少 8 位"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => router.push("/")} disabled={busy}>
              返回
            </Button>
            <Button onClick={submit} disabled={busy}>
              {mode === "login" ? "登录并进入" : "注册并开始"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
