"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Briefcase,
  Code,
  LogOut,
  Menu,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppSidebarContent } from "@/components/shell/app-sidebar-content";
import { LanguageSwitch } from "@/components/shell/language-switch";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserRole } from "@/lib/roles";
import type { UserRoleType } from "@/lib/roles";
import { useUser } from "@/hooks/use-user";
import { useDashboardMeta } from "@/components/shell/dashboard-meta-provider";
import { GlobalBoardChatDock } from "@/components/board/GlobalBoardChatDock";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";
import { WelcomePortal } from "@/components/shell/welcome-portal";
import { useLocale } from "@/i18n/locale-provider";

function initials(email: string) {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return local.slice(0, 2).toUpperCase();
}

function RoleIcon({ role }: { role: UserRoleType | undefined }) {
  if (role === UserRole.PM) {
    return (
      <Briefcase
        className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400"
        strokeWidth={2}
        aria-hidden
      />
    );
  }
  if (role === UserRole.DEVELOPER) {
    return (
      <Code
        className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400"
        strokeWidth={2}
        aria-hidden
      />
    );
  }
  return null;
}

const shellAsideClass =
  "flex h-full shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-[2px_0_24px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isPm, isLoading } = useUser();
  const { meta } = useDashboardMeta();
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openMenuButtonRef = useRef<HTMLButtonElement>(null);

  const isLogin = pathname === "/login" || pathname?.startsWith("/login/");

  useEffect(() => {
    /* Close drawer after in-app navigation (links also call closeMobileNav). */
    const id = requestAnimationFrame(() => setMobileNavOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        openMenuButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  if (isLogin) {
    return <>{children}</>;
  }

  const email = session?.user?.email;
  const role = session?.user?.role as UserRoleType | undefined;
  const authed = !!email;

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <>
      <PresenceHeartbeat />
      <WelcomePortal />
      <div className="flex min-h-screen min-h-[100dvh] bg-background text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
        {/* Desktop sidebar */}
        <aside
          className={`${shellAsideClass} sticky top-0 hidden h-screen transition-[width] duration-200 ease-out lg:flex ${
            collapsed ? "w-[4.25rem]" : "w-60"
          }`}
          aria-hidden={mobileNavOpen}
        >
          <AppSidebarContent
            t={t}
            isPm={isPm}
            collapsed={collapsed}
            isMobile={false}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </aside>

        {/* Mobile drawer + backdrop */}
        <div
          className={`fixed inset-0 z-40 lg:hidden ${
            mobileNavOpen ? "" : "pointer-events-none"
          }`}
          aria-hidden={!mobileNavOpen}
        >
          <button
            type="button"
            tabIndex={mobileNavOpen ? 0 : -1}
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/60 ${
              mobileNavOpen ? "opacity-100" : "opacity-0"
            }`}
            aria-label={t("shell.closeMenu")}
            onClick={closeMobileNav}
          />
          <aside
            id="app-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label={t("shell.mainNavigation")}
            className={`absolute left-0 top-0 flex h-full w-[min(18rem,88vw)] max-w-[320px] flex-col ${shellAsideClass} transition-transform duration-200 ease-out ${
              mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            }`}
          >
            <AppSidebarContent
              t={t}
              isPm={isPm}
              collapsed={false}
              isMobile
              onNavLinkClick={closeMobileNav}
            />
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-[0_1px_0_rgba(0,0,0,0.3)] dark:supports-[backdrop-filter]:bg-slate-900/90">
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5 lg:px-6">
              <div className="flex min-w-0 items-start gap-3 sm:items-center">
                <button
                  ref={openMenuButtonRef}
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 lg:hidden dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-expanded={mobileNavOpen}
                  aria-controls="app-sidebar"
                  onClick={() => setMobileNavOpen((o) => !o)}
                >
                  <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
                  <span className="sr-only">
                    {mobileNavOpen ? t("shell.closeMenu") : t("shell.openMenu")}
                  </span>
                </button>
                <div className="min-w-0 flex-1 pt-0.5 sm:pt-0">
                  <h1 className="text-balance text-lg font-bold leading-tight tracking-tight text-slate-900 sm:truncate md:text-xl dark:text-slate-100">
                    {meta.title}
                  </h1>
                  {meta.subtitle ? (
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500 sm:line-clamp-1 sm:truncate dark:text-slate-400">
                      {meta.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <div
                className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3"
                data-tour="user-menu"
              >
                <ThemeToggle />
                <LanguageSwitch />
                {!isLoading && !authed ? (
                  <Link
                    href="/login"
                    className="flow-btn-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors duration-200"
                  >
                    {t("shell.signIn")}
                  </Link>
                ) : null}
                {authed ? (
                  <div className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-2 py-1.5 shadow-sm sm:gap-3 sm:px-3 sm:py-2 dark:border-slate-700 dark:bg-slate-800/80">
                    <Link
                      href="/settings"
                      className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A3FF]/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                      title={t("shell.settings")}
                    >
                      {session?.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- session-stored profile URL
                        <img
                          src={session.user.image}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover sm:h-9 sm:w-9"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00A3FF] to-[#8A3FFC] text-xs font-bold text-white shadow-sm sm:h-9 sm:w-9"
                          aria-hidden
                        >
                          {initials(email ?? "")}
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <RoleIcon role={role} />
                        <span className="max-w-[min(12rem,40vw)] truncate sm:max-w-[9rem] md:max-w-[14rem]">
                          {email}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {role ?? "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 transition-all duration-200 hover:border-slate-300 hover:bg-white sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-600"
                      title={t("shell.signOut")}
                    >
                      <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">{t("shell.signOut")}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
      <GlobalBoardChatDock />
    </>
  );
}
