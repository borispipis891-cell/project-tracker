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
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [showResendOption, setShowResendOption] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendMessage(null);
    setShowResendOption(false);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);

      // Показываем опцию повторной отправки, если ошибка связана с неподтверждённым email
      if (result.error.includes("Подтвердите email")) {
        setShowResendOption(true);
      }
      return;
    }

    // "Запомнить меня" сейчас влияет на длительность сессии на уровне NextAuth
    // (настраивается в auth-options при необходимости отдельного maxAge).
    void remember;

    router.push("/projects");
  }

  async function handleResendVerification() {
    if (!email) {
      setResendMessage("Введите email для повторной отправки");
      return;
    }

    setResendLoading(true);
    setResendMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage("Письмо отправлено. Проверьте почту.");
        setShowResendOption(false);
      } else {
        setResendMessage(data.error || "Не удалось отправить письмо");
      }
    } catch (err) {
      setResendMessage("Произошла ошибка. Попробуйте позже.");
    } finally {
      setResendLoading(false);
    }
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

        {resendMessage && (
          <div className="mb-4 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {resendMessage}
          </div>
        )}

        {showResendOption && (
          <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2">
            <p className="text-sm text-yellow-800 mb-2">
              Email не подтверждён. Не получили письмо?
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {resendLoading ? "Отправка..." : "Отправить письмо повторно"}
            </button>
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
