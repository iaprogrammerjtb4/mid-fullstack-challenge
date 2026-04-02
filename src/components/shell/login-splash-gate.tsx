"use client";

import { useEffect, useState } from "react";
import { FlowKanbanLogo } from "@/components/brand/flowkanban-logo";
import { useLocale } from "@/i18n/locale-provider";

const SPLASH_HOLD_MS = 2200;
const SPLASH_FADE_MS = 420;
const SPLASH_HOLD_REDUCED_MS = 550;

type Props = {
  children: React.ReactNode;
};

/**
 * Full-screen launch splash (logo) before login + optional onboarding.
 * Timings respect prefers-reduced-motion.
 */
export function LoginSplashGate({ children }: Props) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<"splash" | "fade" | "done">("splash");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduced ? SPLASH_HOLD_REDUCED_MS : SPLASH_HOLD_MS;

    if (reduced) {
      const tDone = window.setTimeout(() => setPhase("done"), hold);
      return () => window.clearTimeout(tDone);
    }

    const toFade = window.setTimeout(() => setPhase("fade"), hold);
    const toDone = window.setTimeout(
      () => setPhase("done"),
      hold + SPLASH_FADE_MS,
    );
    return () => {
      window.clearTimeout(toFade);
      window.clearTimeout(toDone);
    };
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  return (
    <>
      {children}
      {phase !== "done" ? (
        <div
          className={`fixed inset-0 z-[10060] flex flex-col items-center justify-center bg-background px-6 ease-out dark:bg-slate-950 motion-reduce:transition-none ${
            phase === "fade"
              ? "pointer-events-none opacity-0 transition-opacity duration-[420ms]"
              : "opacity-100 transition-opacity duration-300"
          }`}
          role="status"
          aria-live="polite"
          aria-busy={phase === "splash"}
          aria-label={t("login.splashA11y")}
        >
          <div className="flex flex-col items-center gap-8">
            <FlowKanbanLogo variant="full" size="md" priority className="h-12 sm:h-14" />
            <div className="flex gap-2 motion-reduce:opacity-60" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00A3FF]/70 motion-safe:animate-pulse dark:bg-sky-400/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#8A3FFC]/70 motion-safe:animate-pulse motion-safe:[animation-delay:150ms] dark:bg-violet-400/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#00A3FF]/70 motion-safe:animate-pulse motion-safe:[animation-delay:300ms] dark:bg-sky-400/70" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
