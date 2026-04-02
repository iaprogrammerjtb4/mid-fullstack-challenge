"use client";

import { SessionProvider } from "next-auth/react";
import { BoardChatProvider } from "@/components/board/board-chat-context";
import { DashboardMetaProvider } from "@/components/shell/dashboard-meta-provider";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { LocaleProvider } from "@/i18n/locale-provider";
import { ThemeProvider } from "@/theme/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <ThemeProvider>
          <DashboardMetaProvider>
            <BoardChatProvider>
              <DashboardShell>{children}</DashboardShell>
            </BoardChatProvider>
          </DashboardMetaProvider>
        </ThemeProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
