"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBoardAction } from "@/actions/boards";
import { useDashboardMeta } from "@/components/shell/dashboard-meta-provider";
import { useLocale } from "@/i18n/locale-provider";

export default function CreateBoardPage() {
  const router = useRouter();
  const { setMeta } = useDashboardMeta();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setMeta({
      title: t("createBoard.title"),
      subtitle: t("createBoard.subtitle"),
    });
    return () => setMeta({ title: t("meta.dashboard"), subtitle: undefined });
  }, [setMeta, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    const result = await createBoardAction({ name: name.trim() });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/boards/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 transition-colors duration-200 hover:text-blue-900 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {t("createBoard.back")}
        </Link>
        {error ? (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <form
          onSubmit={onSubmit}
          className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
        >
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("createBoard.nameLabel")}
          </label>
          <input
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("createBoard.placeholder")}
            required
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {pending ? t("createBoard.creating") : t("createBoard.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
