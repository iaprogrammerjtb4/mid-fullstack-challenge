"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { EVENTS, Joyride, STATUS, type Step } from "react-joyride";
import { useUser } from "@/hooks/use-user";
import { useLocale } from "@/i18n/locale-provider";
import { useTheme } from "@/theme/theme-provider";

const TOUR_STORAGE_PREFIX = "kanban-tour-v1";

function tourKey(email: string) {
  return `${TOUR_STORAGE_PREFIX}:${email}`;
}

function buildSteps(opts: {
  pathname: string;
  isPm: boolean;
  isDeveloper: boolean;
  hasKanbanCardTourTarget: boolean;
  t: (path: string, vars?: Record<string, string | number>) => string;
}): Step[] {
  const { pathname, isPm, isDeveloper, hasKanbanCardTourTarget, t } = opts;

  const step1Target =
    pathname === "/" ? "#dashboard-welcome" : '[data-tour="board-workspace"]';
  const welcome: Step = {
    title: t("tour.welcomeTitle"),
    target: step1Target,
    content: t("tour.welcomeBody"),
    placement: pathname === "/" ? "bottom" : "center",
  };

  const out: Step[] = [welcome];

  if (isPm) {
    if (pathname.startsWith("/boards/")) {
      out.push({
        title: t("tour.pmBoardTitle"),
        target: '[data-tour="new-task-btn"]',
        content: t("tour.pmBoardBody"),
        placement: "bottom",
      });
    } else {
      out.push({
        title: t("tour.pmHomeTitle"),
        target: '[data-tour="sidebar-new-board"]',
        content: t("tour.pmHomeBody"),
        placement: "right",
      });
    }
  } else if (isDeveloper) {
    if (hasKanbanCardTourTarget) {
      out.push({
        title: t("tour.devCardTitle"),
        target: '[data-tour="kanban-task-card"]',
        content: t("tour.devCardBody"),
        placement: "left",
      });
    } else {
      out.push({
        title: t("tour.devGenericTitle"),
        target: "body",
        content: t("tour.devGenericBody"),
        placement: "center",
      });
    }
  }

  out.push({
    title: t("tour.profileTitle"),
    target: '[data-tour="user-menu"]',
    content: t("tour.profileBody"),
    placement: "bottom-end",
  });

  return out;
}

export function ProductTour() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isPm, isDeveloper } = useUser();
  const { locale, t } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const email = session?.user?.email;

  const tourCompleted =
    typeof window !== "undefined" && email
      ? window.localStorage.getItem(tourKey(email))
      : null;

  const baseReady =
    status === "authenticated" &&
    !!email &&
    typeof window !== "undefined" &&
    !tourCompleted;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- tour steps depend on DOM targets and auth; reset or rebuild on deps */
    let retry: number | undefined;

    if (!baseReady || !email) {
      setSteps([]);
      setRun(false);
    } else {
      const runBuild = () => {
        const hasKanbanCardTourTarget = !!document.querySelector(
          '[data-tour="kanban-task-card"]',
        );
        setSteps(
          buildSteps({
            pathname,
            isPm,
            isDeveloper,
            hasKanbanCardTourTarget,
            t,
          }),
        );
      };

      runBuild();
      retry =
        pathname.startsWith("/boards/") && isDeveloper
          ? (window.setTimeout(runBuild, 900) as unknown as number)
          : undefined;
    }

    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      if (retry) clearTimeout(retry);
    };
  }, [baseReady, email, pathname, isPm, isDeveloper, t, locale]);

  useEffect(() => {
    if (!baseReady || steps.length === 0) return;
    const timer = window.setTimeout(() => setRun(true), 450);
    return () => window.clearTimeout(timer);
  }, [baseReady, steps]);

  if (!baseReady || steps.length === 0) return null;

  return (
    <Joyride
      key={`${locale}-${theme}`}
      run={run}
      steps={steps}
      continuous
      scrollToFirstStep
      options={{
        showProgress: true,
        buttons: ["back", "close", "primary", "skip"],
        primaryColor: isDark ? "#38bdf8" : "#0f172a",
        zIndex: 10000,
        arrowColor: isDark ? "#1e293b" : "#ffffff",
        textColor: isDark ? "#f1f5f9" : "#0f172a",
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        overlayColor: isDark ? "rgba(0,0,0,0.78)" : "rgba(15,23,42,0.45)",
      }}
      styles={{
        tooltip: {
          borderRadius: 12,
          padding: 16,
        },
        buttonPrimary: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonBack: {
          borderRadius: 8,
          fontSize: 14,
        },
      }}
      locale={{
        back: t("tour.back"),
        close: t("tour.close"),
        last: t("tour.done"),
        next: t("tour.next"),
        nextWithProgress: t("tour.nextWithProgress"),
        skip: t("tour.skip"),
      }}
      onEvent={(data) => {
        if (data.type === EVENTS.TOUR_END) {
          setRun(false);
          if (
            data.status === STATUS.FINISHED ||
            data.status === STATUS.SKIPPED
          ) {
            if (email) {
              try {
                window.localStorage.setItem(tourKey(email), "1");
              } catch {
                /* ignore quota */
              }
            }
          }
        }
      }}
    />
  );
}
