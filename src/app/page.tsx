"use client";

import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  FolderKanban,
  Kanban,
  Laptop,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDashboardMeta } from "@/components/shell/dashboard-meta-provider";
import { useUser } from "@/hooks/use-user";
import { useLocale } from "@/i18n/locale-provider";
import type { BoardSummary } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

export default function Home() {
  const { setMeta } = useDashboardMeta();
  const { t } = useLocale();
  const { isPm } = useUser();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMeta({
      title: t("meta.taskBoards"),
      subtitle: t("meta.taskBoardsSubtitle"),
    });
    return () => setMeta({ title: t("meta.dashboard"), subtitle: undefined });
  }, [setMeta, t]);

  async function load() {
    setError(null);
    const res = await fetch("/api/boards", { cache: "no-store" });
    const body = await apiJson<BoardSummary[]>(res);
    if (!body.ok) {
      setError(body.error.message);
      setBoards([]);
      return;
    }
    setBoards(body.data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount fetch for board list
    void load();
  }, []);

  if (boards === null) {
    return (
      <div className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("home.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/90 p-5 shadow-[0_4px_32px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/50 sm:mb-10 sm:p-8 dark:border-slate-700/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:shadow-[0_4px_32px_rgba(0,0,0,0.3)] dark:ring-slate-700/60">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/25 dark:bg-sky-600 dark:shadow-sky-900/30">
              <LayoutGrid className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600/90 dark:text-sky-400">
                {t("home.workspaceBadge")}
              </p>
              <h2 className="mt-2 text-pretty text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
                {t("home.sectionTitle")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t("home.sectionHint")}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <Kanban className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  {t("home.boardCount", { count: boards.length })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-sky-200/60 bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/70 p-5 shadow-sm dark:border-sky-900/40 dark:from-sky-950/40 dark:via-slate-900/90 dark:to-indigo-950/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/25 dark:bg-sky-500">
              <Laptop className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t("home.coworkTitle")}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t("home.coworkBody")}
              </p>
            </div>
          </div>
        </div>

        <div
          id="dashboard-welcome"
          className="mb-8 rounded-xl border border-slate-200/70 bg-white/90 px-5 py-4 text-sm leading-relaxed text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
        >
          {isPm ? (
            <p>
              {t("home.introPmPrefix")}
              <strong className="font-semibold text-slate-800 dark:text-slate-100">
                {t("shell.newBoard")}
              </strong>
              {t("home.introPmSuffix")}
            </p>
          ) : (
            <p>{t("home.introDev")}</p>
          )}
        </div>

        {error ? (
          <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {boards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300/80 bg-white/80 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
            {isPm ? (
              <>
                {t("home.emptyPmPrefix")}
                <strong className="font-semibold text-slate-800 dark:text-slate-100">
                  {t("shell.newBoard")}
                </strong>
                {t("home.emptyPmMid")}
                <code className="mx-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-800 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600">
                  {t("home.emptyPmCode")}
                </code>
                {t("home.emptyPmEnd")}
              </>
            ) : (
              t("home.emptyDev")
            )}
          </p>
        ) : (
          <ul className="space-y-3">
            {boards.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/boards/${b.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_40px_rgba(15,23,42,0.1)] dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-slate-600 dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors duration-200 group-hover:bg-slate-900 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-sky-600 dark:group-hover:text-white">
                    <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {b.name}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {t("home.createdLabel")} {b.createdAt}
                      </span>
                    </p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                    aria-hidden
                  />
                  <span className="sr-only">{t("home.openBoard")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
