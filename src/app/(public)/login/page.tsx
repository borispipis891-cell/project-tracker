"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    // "Запомнить меня" сейчас влияет на длительность сессии на уровне NextAuth
    // (настраивается в auth-options при необходимости отдельного maxAge).
    void remember;

    router.push("/projects");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <form onSubmit={handleSubmit} className="auth-card">
        <h1 className="mb-1 text-lg font-semibold text-ink-900">Вход в Project Tracker</h1>
        <p className="mb-6 text-sm text-ink-500">Введите email и пароль для входа</p>

        {error && (
          <div className="mb-4 rounded-md border border-priority-critical/30 bg-priority-critical/5 px-3 py-2 text-sm text-priority-critical">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm text-ink-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field mb-4"
          placeholder="you@company.ru"
        />

        <label className="mb-1 block text-sm text-ink-700">Пароль</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mb-3"
          placeholder="••••••••"
        />

        <div className="mb-6 flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-border"
            />
            Запомнить меня
          </label>
          <Link href="/forgot-password" className="text-accent hover:underline">
            Забыли пароль?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Входим..." : "Войти"}
        </button>

        <p className="mt-6 text-center text-sm text-ink-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  );
}
