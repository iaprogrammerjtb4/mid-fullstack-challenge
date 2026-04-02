"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUser,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  PlusSquare,
  Shield,
} from "lucide-react";
import { FlowKanbanLogo } from "@/components/brand/flowkanban-logo";
type TFn = (path: string) => string;

type Props = {
  t: TFn;
  isPm: boolean;
  /** Desktop: sidebar is narrow icon-only */
  collapsed: boolean;
  /** Mobile drawer: always show full labels */
  isMobile: boolean;
  onNavLinkClick?: () => void;
  onToggleCollapse?: () => void;
};

const navIdle =
  "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:active:bg-slate-700";

export function AppSidebarContent({
  t,
  isPm,
  collapsed,
  isMobile,
  onNavLinkClick,
  onToggleCollapse,
}: Props) {
  const pathname = usePathname();
  const showLabels = isMobile || !collapsed;

  function linkClass(active: boolean) {
    return `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      active ? "flow-nav-active" : navIdle
    }`;
  }

  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-slate-100 px-3 dark:border-slate-800">
        {!showLabels ? (
          <Link
            href="/"
            onClick={onNavLinkClick}
            className="mx-auto flex min-h-11 min-w-11 items-center justify-center"
            title={t("shell.brandLogoAlt")}
            aria-label={t("shell.brandLogoAlt")}
          >
            <FlowKanbanLogo variant="mark" priority />
          </Link>
        ) : (
          <Link
            href="/"
            onClick={onNavLinkClick}
            className="flex min-h-11 min-w-0 items-center gap-2 py-1 font-semibold text-slate-900 dark:text-slate-100"
            aria-label={t("shell.brandLogoAlt")}
          >
            <FlowKanbanLogo
              variant="full"
              size={isMobile ? "md" : "sm"}
              priority={isMobile}
            />
          </Link>
        )}
      </div>

      <nav
        id="app-sidebar-nav"
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2"
        aria-label={t("shell.mainNavigation")}
      >
        <Link
          href="/"
          onClick={onNavLinkClick}
          className={linkClass(pathname === "/")}
          title={!showLabels ? t("shell.boards") : undefined}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
          {showLabels ? <span>{t("shell.boards")}</span> : null}
        </Link>
        <Link
          href="/settings"
          onClick={onNavLinkClick}
          className={linkClass(pathname === "/settings")}
          title={!showLabels ? t("shell.settingsShort") : undefined}
        >
          <CircleUser className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
          {showLabels ? <span>{t("shell.settings")}</span> : null}
        </Link>
        {isPm ? (
          <Link
            href="/create-board"
            data-tour="sidebar-new-board"
            onClick={onNavLinkClick}
            className={linkClass(pathname === "/create-board")}
            title={!showLabels ? t("shell.newBoard") : undefined}
          >
            <PlusSquare className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {showLabels ? <span>{t("shell.newBoard")}</span> : null}
          </Link>
        ) : null}
        {isPm ? (
          <Link
            href="/admin"
            onClick={onNavLinkClick}
            className={linkClass(pathname === "/admin")}
            title={!showLabels ? t("shell.admin") : undefined}
          >
            <Shield className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            {showLabels ? <span>{t("shell.admin")}</span> : null}
          </Link>
        ) : null}
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-2 dark:border-slate-800">
        {isMobile ? (
          <button
            type="button"
            onClick={onNavLinkClick}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {t("shell.closeMenu")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-expanded={!collapsed}
            title={
              collapsed
                ? t("shell.expandSidebar")
                : t("shell.collapseSidebar")
            }
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <PanelLeftClose className="h-5 w-5 shrink-0" aria-hidden />
            )}
            {showLabels ? <span>{t("shell.collapse")}</span> : null}
          </button>
        )}
      </div>
    </>
  );
}
