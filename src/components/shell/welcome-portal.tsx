"use client";

import { Sparkles, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { FlowKanbanLogo } from "@/components/brand/flowkanban-logo";
import { ProductTour } from "@/components/shell/product-tour";
import { useLocale } from "@/i18n/locale-provider";

const WELCOME_STORAGE_PREFIX = "flowkanban-welcome-v1";

function welcomeKey(email: string) {
  return `${WELCOME_STORAGE_PREFIX}:${email}`;
}

function WelcomeModal({
  onContinue,
  onSkip,
}: {
  onContinue: () => void;
  onSkip: () => void;
}) {
  const { t } = useLocale();

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center overflow-y-auto bg-slate-950/65 px-4 py-10 backdrop-blur-md dark:bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-portal-title"
      aria-describedby="welcome-portal-desc"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)] dark:border-slate-600 dark:bg-slate-900 sm:p-8">
        <button
          type="button"
          onClick={onSkip}
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={t("welcomePortal.skip")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="mb-5 flex flex-col items-center gap-3 text-center sm:mb-6">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#00A3FF]/15 to-[#8A3FFC]/15 text-[#0077cc] dark:text-sky-300"
            aria-hidden
          >
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </span>
          <FlowKanbanLogo variant="full" size="md" className="max-h-9" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("welcomePortal.tagline")}
          </p>
          <h1
            id="welcome-portal-title"
            className="text-balance text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100"
          >
            {t("welcomePortal.title")}
          </h1>
        </div>

        <div
          id="welcome-portal-desc"
          className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
        >
          <p>{t("welcomePortal.lead")}</p>
          <ul className="list-inside list-disc space-y-2.5 marker:text-[#00A3FF] dark:marker:text-sky-400">
            <li>{t("welcomePortal.featureBoards")}</li>
            <li>{t("welcomePortal.featureReports")}</li>
            <li>{t("welcomePortal.featureChatVoice")}</li>
            <li>{t("welcomePortal.featureCowork")}</li>
          </ul>
          <p className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            {t("welcomePortal.tourHint")}
          </p>
        </div>

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="block font-medium text-slate-600 dark:text-slate-300">
            {t("welcomePortal.creditPrefix")}{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {t("welcomePortal.creditName")}
            </span>
          </span>
          <a
            href="https://iaprogrammer.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block font-semibold text-[#0077cc] underline-offset-2 transition-colors hover:text-[#00A3FF] hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            {t("welcomePortal.creditSite")}
          </a>
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onContinue}
            className="flow-btn-primary min-h-11 w-full rounded-xl px-6 text-sm font-semibold sm:w-auto"
          >
            {t("welcomePortal.cta")}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
          >
            {t("welcomePortal.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WelcomePortal() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;
  const [mounted, setMounted] = useState(false);
  const [dismissVersion, setDismissVersion] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const welcomeOpen = useMemo(() => {
    if (status === "loading") return null;
    if (status !== "authenticated" || !email) return false;
    if (!mounted) return null;
    void dismissVersion;
    try {
      return !window.localStorage.getItem(welcomeKey(email));
    } catch {
      return false;
    }
  }, [mounted, status, email, dismissVersion]);

  useEffect(() => {
    if (welcomeOpen !== true) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [welcomeOpen]);

  function dismissWelcome() {
    if (email) {
      try {
        window.localStorage.setItem(welcomeKey(email), "1");
      } catch {
        /* ignore */
      }
    }
    setDismissVersion((v) => v + 1);
  }

  const tourBlocked = welcomeOpen !== false;

  return (
    <>
      {welcomeOpen === true ? (
        <WelcomeModal onContinue={dismissWelcome} onSkip={dismissWelcome} />
      ) : null}
      <ProductTour blocked={tourBlocked} />
    </>
  );
}
