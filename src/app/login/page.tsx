"use client";

import { Suspense } from "react";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useLocale } from "@/i18n/locale-provider";
import { LoginOnboardingWalkthrough } from "@/components/shell/login-onboarding-walkthrough";
import { LoginSplashGate } from "@/components/shell/login-splash-gate";
import { LoginForm } from "./login-form";

function LoginFallback() {
  const { t } = useLocale();
  return (
    <div className="text-sm text-slate-500 dark:text-slate-400">
      {t("login.loading")}
    </div>
  );
}

export default function LoginPage() {
  return (
    <LoginSplashGate>
      <div className="relative flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] transition-colors duration-200 dark:bg-slate-950 sm:px-6 sm:py-16">
        <LoginOnboardingWalkthrough />
        <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center gap-2 sm:right-6 sm:top-6">
          <ThemeToggle />
          <LanguageSwitch />
        </div>
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </LoginSplashGate>
  );
}
