"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FlowKanbanLogo } from "@/components/brand/flowkanban-logo";
import { useLocale } from "@/i18n/locale-provider";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
      redirectTo: callbackUrl,
    });
    setPending(false);
    if (res?.error) {
      setError(t("login.invalidCredentials"));
      return;
    }
    window.location.assign(res?.url ?? callbackUrl);
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/40 sm:p-8 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] dark:ring-slate-700/80">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <FlowKanbanLogo variant="full" size="md" priority />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flow-slate dark:text-slate-400">
          {t("login.tagline")}
        </p>
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {t("login.title")}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {t("login.hint")}
      </p>
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("login.email")}
          <input
            type="email"
            autoComplete="username"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("login.password")}
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flow-btn-primary mt-2 min-h-11 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-200 touch-manipulation"
        >
          {pending ? t("login.signingIn") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
