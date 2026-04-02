"use client";

import { useLocale } from "@/i18n/locale-provider";

export function PresenceBadge({ online }: { online: boolean }) {
  const { t } = useLocale();

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold"
      title={online ? t("presence.onlineHint") : t("presence.offlineHint")}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          online
            ? "bg-gradient-to-br from-[#00A3FF] to-[#8A3FFC] shadow-[0_0_8px_rgba(0,163,255,0.55)]"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
        aria-hidden
      />
      <span
        className={
          online
            ? "text-[#0077cc] dark:text-sky-300"
            : "text-slate-500 dark:text-slate-400"
        }
      >
        {online ? t("presence.online") : t("presence.offline")}
      </span>
    </span>
  );
}
