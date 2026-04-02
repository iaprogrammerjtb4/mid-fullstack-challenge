"use client";

import { Languages } from "lucide-react";
import type { AppLocale } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/locale-provider";

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale();

  function select(next: AppLocale) {
    setLocale(next);
  }

  return (
    <div
      className="inline-flex touch-manipulation items-center gap-1 rounded-xl border border-slate-200/90 bg-white/90 p-1 shadow-sm backdrop-blur-sm sm:gap-2 dark:border-slate-600/80 dark:bg-slate-800/90"
      data-tour="language-switch"
      role="group"
      aria-label={t("shell.language")}
    >
      <span
        className="hidden pl-2 text-slate-400 dark:text-slate-500 sm:inline"
        aria-hidden
      >
        <Languages className="h-4 w-4" strokeWidth={2} />
      </span>
      {(["en", "es"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => select(code)}
          className={`min-h-10 min-w-10 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all duration-200 sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5 ${
            locale === code
              ? "bg-slate-900 text-white shadow-sm dark:bg-sky-600"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          }`}
          aria-pressed={locale === code}
        >
          {t(`shell.${code}`)}
        </button>
      ))}
    </div>
  );
}
