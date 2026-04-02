"use client";

import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";
import { useTheme } from "@/theme/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 sm:h-10 sm:w-10 dark:border-slate-600/80 dark:bg-slate-800/90 dark:text-amber-200/90 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-amber-100"
      aria-label={
        isDark ? t("shell.switchToLight") : t("shell.switchToDark")
      }
      title={isDark ? t("shell.switchToLight") : t("shell.switchToDark")}
    >
      {isDark ? (
        <Sun className="h-4 w-4" strokeWidth={2} aria-hidden />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}
