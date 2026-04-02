"use client";

import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";
import type { TaskPriority } from "@/lib/types";

const wrap =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border";

export function PriorityIcon({ priority }: { priority: TaskPriority }) {
  const { t } = useLocale();

  switch (priority) {
    case "high":
      return (
        <span
          className={`${wrap} border-red-200 bg-red-50 text-red-600`}
          title={t("taskCard.high")}
          aria-hidden
        >
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      );
    case "medium":
      return (
        <span
          className={`${wrap} border-amber-200 bg-amber-50 text-amber-600`}
          title={t("taskCard.medium")}
          aria-hidden
        >
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      );
    case "low":
    default:
      return (
        <span
          className={`${wrap} border-slate-200 bg-slate-100 text-slate-500`}
          title={t("taskCard.low")}
          aria-hidden
        >
          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      );
  }
}
