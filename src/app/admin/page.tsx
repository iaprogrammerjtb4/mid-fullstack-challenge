"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { useDashboardMeta } from "@/components/shell/dashboard-meta-provider";
import { useLocale } from "@/i18n/locale-provider";

export default function AdminPage() {
  const { setMeta } = useDashboardMeta();
  const { t } = useLocale();

  useEffect(() => {
    setMeta({ title: t("admin.title"), subtitle: t("admin.subtitle") });
    return () => setMeta({ title: t("meta.dashboard"), subtitle: undefined });
  }, [setMeta, t]);

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 transition-colors duration-200 hover:text-blue-900 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {t("admin.back")}
        </Link>
        <p className="mt-4 max-w-3xl text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {t("admin.body1")}
        </p>

        <div className="mt-10">
          <AdminDashboard />
          <AdminUsersPanel />
        </div>
      </div>
    </div>
  );
}
