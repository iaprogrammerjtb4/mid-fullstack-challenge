"use client";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MessageCircle,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlowKanbanLogo } from "@/components/brand/flowkanban-logo";
import { useLocale } from "@/i18n/locale-provider";

const STORAGE_KEY = "flowkanban-login-onboarding-v1";
const SLIDE_COUNT = 4;
const SWIPE_PX = 56;

const slideIcons = [LayoutGrid, BarChart3, MessageCircle, UsersRound] as const;

export function LoginOnboardingWalkthrough() {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [dismissVersion, setDismissVersion] = useState(0);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const pointerActive = useRef(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const open = useMemo(() => {
    if (!mounted) return false;
    void dismissVersion;
    try {
      return !window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }, [mounted, dismissVersion]);

  const complete = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissVersion((v) => v + 1);
    setIndex(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        setIndex((i) => Math.min(i + 1, SLIDE_COUNT - 1));
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Escape") {
        complete();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, complete]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, SLIDE_COUNT - 1));
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -SWIPE_PX) goNext();
    else if (dx > SWIPE_PX) goPrev();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    pointerActive.current = true;
    pointerStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointerActive.current || pointerStartX.current == null) return;
    const dx = e.clientX - pointerStartX.current;
    pointerActive.current = false;
    pointerStartX.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (dx < -SWIPE_PX) goNext();
    else if (dx > SWIPE_PX) goPrev();
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    pointerActive.current = false;
    pointerStartX.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10040] flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-10 backdrop-blur-md dark:bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-roledescription="carousel"
      aria-labelledby={`login-onboarding-title-${index}`}
      aria-describedby={`login-onboarding-body-${index}`}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-slate-600 dark:bg-slate-900 sm:max-w-lg">
        <button
          type="button"
          onClick={complete}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={t("loginOnboarding.skip")}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="border-b border-slate-100 px-6 pb-4 pt-6 text-center dark:border-slate-800 sm:px-8 sm:pt-8">
          <FlowKanbanLogo variant="full" size="sm" className="mx-auto max-h-8 opacity-90" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {t("loginOnboarding.badge")}
          </p>
        </div>

        <div
          className="touch-pan-y px-6 pb-2 pt-2 sm:px-8"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div className="overflow-hidden rounded-xl">
            <div
              className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{
                width: `${SLIDE_COUNT * 100}%`,
                transform: `translateX(-${(index * 100) / SLIDE_COUNT}%)`,
              }}
            >
              {slideIcons.map((Icon, i) => (
                <div
                  key={i}
                  className="shrink-0 px-1"
                  style={{ width: `${100 / SLIDE_COUNT}%` }}
                >
                  <div
                    className="mx-auto flex min-h-[200px] max-w-[280px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#00A3FF]/12 via-slate-50 to-[#8A3FFC]/10 px-4 py-8 dark:from-sky-500/15 dark:via-slate-800/80 dark:to-violet-500/10 sm:min-h-[220px]"
                    aria-hidden={i !== index}
                  >
                    <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-600">
                      <Icon
                        className="h-10 w-10 text-[#0077cc] dark:text-sky-400"
                        strokeWidth={1.5}
                      />
                    </span>
                  </div>
                  <div className="mt-5 text-center" aria-live="polite">
                    <h2
                      id={`login-onboarding-title-${i}`}
                      className="text-balance text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl"
                    >
                      {t(`loginOnboarding.slide${(i + 1) as 1 | 2 | 3 | 4}Title`)}
                    </h2>
                    <p
                      id={`login-onboarding-body-${i}`}
                      className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300"
                    >
                      {t(`loginOnboarding.slide${(i + 1) as 1 | 2 | 3 | 4}Body`)}
                    </p>
                    {i === SLIDE_COUNT - 1 ? (
                      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {t("loginOnboarding.creditPrefix")}{" "}
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {t("loginOnboarding.creditName")}
                          </span>
                        </span>
                        <br />
                        <a
                          href="https://iaprogrammer.net/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block font-semibold text-[#0077cc] underline-offset-2 hover:underline dark:text-sky-400"
                        >
                          {t("loginOnboarding.creditSite")}
                        </a>
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-4 pt-2" role="tablist" aria-label={t("loginOnboarding.progressLabel")}>
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t("loginOnboarding.goToSlide", { n: String(i + 1) })}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-200 ${
                i === index
                  ? "w-8 bg-[#0077cc] dark:bg-sky-500"
                  : "w-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="order-2 text-center text-xs text-slate-400 dark:text-slate-500 sm:order-1 sm:text-left">
            {t("loginOnboarding.progress", {
              current: String(index + 1),
              total: String(SLIDE_COUNT),
            })}
          </p>
          <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row sm:justify-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goPrev}
                disabled={index === 0}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:flex-initial"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {t("loginOnboarding.back")}
              </button>
              {index < SLIDE_COUNT - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flow-btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold sm:flex-initial"
                >
                  {t("loginOnboarding.next")}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={complete}
                  className="flow-btn-primary inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-5 text-sm font-semibold sm:flex-initial"
                >
                  {t("loginOnboarding.getStarted")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
